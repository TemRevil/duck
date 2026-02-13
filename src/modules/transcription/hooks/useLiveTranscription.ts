
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
    const { primaryTranscriptionLanguage, secondaryTranscriptionLanguage, modelQuality } = useSettingsStore();
    
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

    const lastProcessedIndex = useRef(0);
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

            // Show message if using non-English language
            if (primaryTranscriptionLanguage !== 'en' && primaryTranscriptionLanguage !== 'auto') {
                const langDisplay = primaryTranscriptionLanguage === 'ar-EG' ? 'Egyptian Arabic' : primaryTranscriptionLanguage.toUpperCase();
                toast.success(`Recording started (${langDisplay})`);
            } else {
                toast.success('Recording started');
            }

            // Start periodic transcription
            processingInterval.current = setInterval(async () => {
                if (!recorderRef.current) return;

                const audioWindow = recorderRef.current.getWindowAudio(currentSampleRate, 30);

                if (audioWindow.length > 16000 * 1) {
                    try {
                        const result = await engine.transcribe(audioWindow, {
                            model: `Xenova/whisper-${modelQuality}${primaryTranscriptionLanguage === 'en' ? '.en' : ''}`,
                            language: primaryTranscriptionLanguage === 'auto' ? undefined : primaryTranscriptionLanguage,
                            secondaryLanguage: secondaryTranscriptionLanguage || undefined,
                        });
                        
                        // Update accumulated transcript with new data
                        accumulatedTranscript.current = result.text || '';
                        setInterimTranscript(result.text || '');
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

    // Non-blocking finalization - happens in the background
    const performFinalization = async (finalAudio: Float32Array) => {
        const dbId = dbIdRef.current;

        try {
            console.log('=== BACKGROUND FINALIZATION STARTED ===');
            console.log('Final audio length:', finalAudio.length, 'duration:', finalAudio.length / 16000, 'seconds');
            console.log('Accumulated from live:', accumulatedTranscript.current ? accumulatedTranscript.current.length : 0, 'chars');

            // Update global status
            updateStatus('processing', 'Flushing transcription buffer...');
            setStatus('Flushing transcription buffer...');

            // Phase 1: Wait for live transcription to flush
            console.log('Phase 1: Waiting for live transcription to flush...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Phase 2: Do final complete transcription of entire audio
            console.log('Phase 2: Starting final transcription of complete audio...');
            updateStatus('processing', 'Finalizing transcription...');
            setStatus('Finalizing transcription...');
            
            let finalTranscript = accumulatedTranscript.current || '';
            
            // Only do final transcription if we have audio and haven't gotten complete text yet
            if (finalAudio.length > 16000 * 2) {
                try {
                    console.log('Performing complete audio transcription...');
                    const completeResult = await engine.transcribe(finalAudio, {
                        model: `Xenova/whisper-${modelQuality}${primaryTranscriptionLanguage === 'en' ? '.en' : ''}`,
                        language: primaryTranscriptionLanguage === 'auto' ? undefined : primaryTranscriptionLanguage,
                        secondaryLanguage: secondaryTranscriptionLanguage || undefined,
                        onProgress: (p) => {
                            console.log('Final transcription progress:', p);
                            setStatus(p);
                        }
                    });

                    console.log('Complete transcription result:', {
                        text: completeResult.text,
                        length: completeResult.text ? completeResult.text.length : 0,
                        chunks: completeResult.chunks ? completeResult.chunks.length : 0
                    });

                    // Use complete result as it has the full audio
                    finalTranscript = completeResult.text || finalTranscript;
                } catch (transcribeError) {
                    console.error('Complete transcription failed:', transcribeError);
                    const errorMsg = transcribeError instanceof Error ? transcribeError.message : String(transcribeError);
                    
                    // If it's a language model issue, inform user
                    if (errorMsg.includes('Failed to fetch') && primaryTranscriptionLanguage !== 'en') {
                        console.log('Language model unavailable - worker may have used English fallback');
                        toast.success(`${primaryTranscriptionLanguage.toUpperCase()} model unavailable - using English model instead`);
                    }
                    
                    console.log('Falling back to accumulated transcript');
                }
            }

            console.log('=== FINALIZATION ===');
            console.log('Final transcript length:', finalTranscript ? finalTranscript.length : 0);
            console.log('Final transcript:', finalTranscript);

            updateStatus('processing', 'Saving transcription...');
            setStatus('Saving transcription...');

            // Phase 3: Convert audio to blob
            const audioBlob = float32ToWavBlob(finalAudio, 16000);
            console.log('Audio blob created:', { size: audioBlob.size, type: audioBlob.type });

            // Phase 4: Create segments
            let segments: any[] = [];
            if (finalTranscript) {
                segments = [{
                    speaker: 'Speaker 1',
                    text: finalTranscript,
                    start: 0,
                    end: finalAudio.length / 16000
                }];
            }

            // Phase 5: Save to database
            if (dbId) {
                console.log('=== PHASE 5: DATABASE SAVE ===');
                console.log('Saving with:', {
                    dbId,
                    transcriptLength: finalTranscript.length,
                    segmentsCount: segments.length,
                    duration: finalAudio.length / 16000,
                    audioBlobSize: audioBlob.size
                });

                await db.transcriptions.update(dbId, {
                    duration: finalAudio.length / 16000,
                    transcript: finalTranscript,
                    segments: segments,
                    audioBlob,
                    status: 'completed'
                });

                setTranscript(finalTranscript);
                setStatus('Completed');
                setIsProcessing(false);
                
                // Complete the global session
                completeSession();
                
                console.log('✓ Recording finalized and saved successfully');
                console.log('Final session summary:', {
                    duration: finalAudio.length / 16000,
                    textLength: finalTranscript.length,
                    words: finalTranscript.split(/\s+/).length
                });

                toast.success(`Recording transcribed and saved (${(finalAudio.length / 16000).toFixed(1)}s)`);
            }

        } catch (error) {
            console.error("=== FATAL ERROR IN FINALIZATION ===", error);
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
        // Also expose global state for app-wide visibility
        isRecordingActive,
        isProcessingActive,
        globalStatus,
        globalStatusMessage,
        startRecording,
        stopRecording
    };
};
