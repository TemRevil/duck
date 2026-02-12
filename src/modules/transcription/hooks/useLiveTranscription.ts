
import { useState, useRef, useEffect } from 'react';
import { AudioRecorder } from '../../audio/audioRecorder';
import { TranscriptionEngine } from '../engine';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { db } from '../store/db';
import { toast } from 'react-hot-toast';
import { clusterSegments } from '../utils/diarization';

export const useLiveTranscription = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [status, setStatus] = useState<string>('');

    const recorderRef = useRef<AudioRecorder | null>(null);
    const engine = TranscriptionEngine.getInstance();
    const { primaryTranscriptionLanguage, secondaryTranscriptionLanguage, modelQuality } = useSettingsStore();

    const lastProcessedIndex = useRef(0);
    const processingInterval = useRef<any>(null);

    const startRecording = async () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const currentSampleRate = audioCtx.sampleRate;

            recorderRef.current = new AudioRecorder();
            await recorderRef.current.start();
            setIsRecording(true);
            setTranscript('');
            setInterimTranscript('');
            setStatus('Recording...');

            // Initial save to history as processing
            const entryId = await db.transcriptions.add({
                title: `Recording ${new Date().toLocaleString()}`,
                date: new Date(),
                duration: 0,
                transcript: '',
                segments: [],
                status: 'processing'
            });
            (recorderRef.current as any).dbId = entryId;

            // Start periodic transcription
            processingInterval.current = setInterval(async () => {
                if (!recorderRef.current) return;

                // Get audio for transcription
                // For live transcription, we use a sliding window of the last 30 seconds
                // to keep it fast while providing enough context for Whisper.
                // We extract and resample ONLY the window to maintain performance.
                const audioWindow = recorderRef.current.getWindowAudio(currentSampleRate, 30);

                if (audioWindow.length > 16000 * 1) { // Process if we have more than 1 second
                     try {
                        const result = await engine.transcribe(audioWindow, {
                            model: `Xenova/whisper-${modelQuality}${primaryTranscriptionLanguage === 'en' ? '.en' : ''}`,
                            language: primaryTranscriptionLanguage === 'auto' ? undefined : primaryTranscriptionLanguage,
                            secondaryLanguage: secondaryTranscriptionLanguage || undefined,
                        });
                        // Append to transcript if we were doing incremental,
                        // but here we just show the window result as interim
                        setInterimTranscript(result.text);
                     } catch (err) {
                        console.error("Live transcription error:", err);
                     }
                }
            }, 4000);

        } catch (error) {
            console.error("Failed to start recording:", error);
            toast.error("Failed to start recording");
        }
    };

    const stopRecording = async () => {
        if (!isRecording || !recorderRef.current) return;

        const dbId = (recorderRef.current as any).dbId;
        clearInterval(processingInterval.current);
        setIsRecording(false);
        setStatus('Finishing transcription...');

        const finalAudio = await recorderRef.current.stop();

        try {
            const result = await engine.transcribe(finalAudio, {
                model: `Xenova/whisper-${modelQuality}${primaryTranscriptionLanguage === 'en' ? '.en' : ''}`,
                language: primaryTranscriptionLanguage === 'auto' ? undefined : primaryTranscriptionLanguage,
                secondaryLanguage: secondaryTranscriptionLanguage || undefined,
                onProgress: (p) => setStatus(p)
            });

            setTranscript(result.text);
            setInterimTranscript('');
            setStatus('Completed');

            // Update DB
            await db.transcriptions.update(dbId, {
                duration: finalAudio.length / 16000,
                transcript: result.text,
                segments: clusterSegments(result.chunks).map(c => ({
                    speaker: c.speaker || 'Speaker 1',
                    text: c.text,
                    start: (c.timestamp?.[0]) || 0,
                    end: (c.timestamp?.[1]) || 0
                })),
                status: 'completed'
            });

            toast.success("Transcription saved to history");
            return dbId;

        } catch (error) {
            if (dbId) {
                await db.transcriptions.update(dbId, { status: 'error' });
            }
            console.error("Final transcription error:", error);
            setStatus('Error');
            toast.error("Transcription failed");
        }
    };

    return {
        isRecording,
        transcript,
        interimTranscript,
        status,
        startRecording,
        stopRecording
    };
};
