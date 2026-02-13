
import { useState, useRef, useEffect } from 'react';
import { AudioRecorder } from '../../audio/audioRecorder';
import { TranscriptionEngine } from '../engine';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { useRecordingStore } from '../store/recordingStore';
import { db } from '../store/db';
import { toast } from 'react-hot-toast';
import { clusterSegments } from '../utils/diarization';

// Helper function to convert Float32Array to WAV Blob
function float32ToWavBlob(float32Array: Float32Array, sampleRate: number): Blob {
    const frameLength = float32Array.length;
    const descriptionByteLength = 36;
    const headerByteLength = 8;
    const totalLength = headerByteLength + descriptionByteLength + frameLength * 2;

    const arrayBuffer = new ArrayBuffer(44 + frameLength * 2);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk length
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bit depth

    writeString(36, 'data');
    view.setUint32(40, frameLength * 2, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < frameLength; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const useLiveTranscription = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [status, setStatus] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const recorderRef = useRef<AudioRecorder | null>(null);
    const engine = TranscriptionEngine.getInstance();
    const { primaryTranscriptionLanguage, secondaryTranscriptionLanguage } = useSettingsStore();

    // Global recording state - persists across navigation
    const {
        isRecordingActive,
        isProcessingActive,
        currentStatus: globalStatus,
        statusMessage: globalStatusMessage,
        startSession,
        updateStatus,
        setErrorMessage,
        completeSession,
        resetSession
    } = useRecordingStore();

    const processingInterval = useRef<any>(null);
    const accumulatedTranscript = useRef<string>('');
    const dbIdRef = useRef<number | null>(null);

    const startRecording = async () => {
        // Check if any recording is already active globally
        if (isRecordingActive || isProcessingActive) {
            toast.error('A recording session is already in progress. Please wait for it to complete.');
            return;
        }

        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const currentSampleRate = audioCtx.sampleRate;

            recorderRef.current = new AudioRecorder();
            await recorderRef.current.start();

            // Initial save to history
            const entryId = await db.transcriptions.add({
                title: `Recording ${new Date().toLocaleString()}`,
                date: new Date(),
                duration: 0,
                transcript: '',
                segments: [],
                status: 'processing'
            });
            dbIdRef.current = entryId;
            (recorderRef.current as any).dbId = entryId;

            // Update global recording state
            startSession(entryId.toString());

            // Local UI state
            setIsRecording(true);
            setTranscript('');
            setInterimTranscript('');
            setStatus('Recording...');
            accumulatedTranscript.current = '';
            setIsProcessing(false);

            toast.success('Recording started');

            // Start periodic transcription (lively updates)
            processingInterval.current = setInterval(async () => {
                if (!recorderRef.current) return;

                const audioWindow = recorderRef.current.getWindowAudio(currentSampleRate, 30);

                if (audioWindow.length > 16000 * 1) {
                    try {
                        const result = await engine.transcribe(audioWindow, {
                            language: primaryTranscriptionLanguage,
                            secondaryLanguage: secondaryTranscriptionLanguage || undefined,
                        });

                        setInterimTranscript(result.text || '');
                        // We don't necessarily want to accumulate here if we're doing a full pass at the end,
                        // but it helps for long sessions.
                        accumulatedTranscript.current = result.text || '';
                    } catch (err) {
                        console.error("Live transcription error:", err);
                    }
                }
            }, 4000);

        } catch (error) {
            console.error("Failed to start recording:", error);
            resetSession();
            setIsRecording(false);
            setIsProcessing(false);
            toast.error("Failed to start recording");
        }
    };

    const stopRecording = () => {
        if (!isRecording || !recorderRef.current) return;

        // Immediately update local state
        setIsRecording(false);
        setIsProcessing(true);
        setStatus('Finalizing...');

        // Clear interval
        clearInterval(processingInterval.current);

        // Get final audio (synchronous)
        recorderRef.current.stop().then(finalAudio => {
            // Schedule finalization as non-blocking background task
            performFinalization(finalAudio);
        });

        // Return immediately - finalization happens in background
        toast.loading('Recording stopped. Processing in background...');
    };

    const performFinalization = async (finalAudio: Float32Array) => {
        const dbId = dbIdRef.current;

        try {
            updateStatus('processing', 'Finalizing transcription...');
            setStatus('Finalizing transcription...');

            let finalResult;

            if (finalAudio.length > 16000 * 1) {
                finalResult = await engine.transcribe(finalAudio, {
                    language: primaryTranscriptionLanguage,
                    secondaryLanguage: secondaryTranscriptionLanguage || undefined,
                    onProgress: (p) => {
                        setStatus(p);
                        updateStatus('processing', p);
                    }
                });
            } else {
                finalResult = { text: accumulatedTranscript.current, chunks: [] };
            }

            setStatus('Saving...');
            updateStatus('processing', 'Saving transcription...');

            // Convert audio to blob
            const audioBlob = float32ToWavBlob(finalAudio, 16000);

            // Create segments using diarization util
            const segments = clusterSegments(finalResult.chunks).map(c => ({
                speaker: c.speaker || 'Speaker 1',
                text: c.text,
                start: c.timestamp?.[0] || 0,
                end: c.timestamp?.[1] || 0
            }));

            // Save to database
            if (dbId) {
                await db.transcriptions.update(dbId, {
                    duration: finalAudio.length / 16000,
                    transcript: finalResult.text,
                    segments: segments,
                    audioBlob,
                    status: 'completed'
                });

                setTranscript(finalResult.text);
                setInterimTranscript('');
                setStatus('Completed');
                setIsProcessing(false);

                // Complete the global session
                completeSession();

                toast.success("Transcription saved to history");
            }

        } catch (error) {
            console.error("Fatal error in finalization:", error);
            if (dbId) {
                await db.transcriptions.update(dbId, { status: 'error' });
            }
            setStatus('Error');
            setIsProcessing(false);

            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage(errorMsg);

            toast.error("Finalization failed: " + errorMsg);
        }
    };

    return {
        isRecording,
        transcript,
        interimTranscript,
        status,
        isProcessing,
        isRecordingActive,
        isProcessingActive,
        globalStatus,
        globalStatusMessage,
        startRecording,
        stopRecording
    };
};
