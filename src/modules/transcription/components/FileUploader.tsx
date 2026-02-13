
import React, { useCallback, useState } from 'react';
import { Upload, FileAudio, Loader2, CheckCircle } from 'lucide-react';
import { GlassCard, GlassButton } from '../../../components/ui';
import { TranscriptionEngine } from '../engine';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { db } from '../store/db';
import { toast } from 'react-hot-toast';
import { clusterSegments } from '../utils/diarization';

export const FileUploader: React.FC = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const { primaryTranscriptionLanguage, secondaryTranscriptionLanguage } = useSettingsStore();
    const engine = TranscriptionEngine.getInstance();

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProgress('Preparing audio...');

        try {
            const audioContext = new AudioContext();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Resample to 16kHz
            const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineCtx.destination);
            source.start();
            const resampledBuffer = await offlineCtx.startRendering();

            const audioData = resampledBuffer.getChannelData(0);

            setProgress('Transcribing...');
            const result = await engine.transcribe(audioData, {
                language: primaryTranscriptionLanguage,
                secondaryLanguage: secondaryTranscriptionLanguage || undefined,
                onProgress: (p) => setProgress(p)
            });

            await db.transcriptions.add({
                title: file.name,
                date: new Date(),
                duration: audioBuffer.duration,
                transcript: result.text,
                segments: clusterSegments(result.chunks).map(c => ({
                    speaker: c.speaker || 'Speaker 1',
                    text: c.text,
                    start: c.timestamp[0],
                    end: c.timestamp[1]
                })),
                status: 'completed'
            });

            toast.success("File transcribed successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to process file");
        } finally {
            setIsProcessing(false);
            setProgress('');
        }
    };

    return (
        <div className="w-full">
            <GlassCard className="p-12 border-dashed border-2 border-pearl-aqua/30 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-pearl-aqua/10 flex items-center justify-center text-pearl-aqua mb-6">
                    {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                </div>

                <h3 className="text-xl font-bold mb-2">Transcribe Audio File</h3>
                <p className="text-sm text-taupe-grey/60 mb-8 max-w-xs">
                    Upload an MP3, WAV, or M4A file to convert it to text using our offline AI engine.
                </p>

                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                />

                <label htmlFor="file-upload" className={`cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="glass-button glass-button-primary shadow-lg hover:shadow-tropical-teal/30 px-10 py-4 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-300">
                        {isProcessing ? progress : 'Browse Files'}
                    </div>
                </label>

                {isProcessing && (
                    <div className="mt-6 flex items-center gap-2 text-tropical-teal text-sm font-bold">
                        <div className="w-48 h-2 bg-taupe-grey/10 rounded-full overflow-hidden">
                            <div className="h-full bg-tropical-teal animate-pulse w-full" />
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
