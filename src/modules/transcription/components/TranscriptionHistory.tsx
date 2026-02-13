
import React from 'react';
import { db, TranscriptionEntry } from '../store/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { GlassCard, GlassButton } from '../../../components/ui';
import { Calendar, Clock, Trash2, FileText, Download, Loader2, Play, RefreshCw, Pause } from 'lucide-react';
import { formatTime } from '../../../utils';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { translations } from '../../../utils/translations';
import { toast } from 'react-hot-toast';
import { TranscriptionEngine } from '../engine';
import { clusterSegments } from '../utils/diarization';
import { TranscriptionModal } from './TranscriptionModal';

export const TranscriptionHistory: React.FC = () => {
    const entries = useLiveQuery(() => db.transcriptions.orderBy('date').reverse().toArray());
    const { language, primaryTranscriptionLanguage, secondaryTranscriptionLanguage, modelQuality } = useSettingsStore();
    const t = translations[language];
    const [expandedId, setExpandedId] = React.useState<number | null>(null);
    const [modalEntry, setModalEntry] = React.useState<TranscriptionEntry | null>(null);
    const [playingId, setPlayingId] = React.useState<number | null>(null);
    const [retranscribingId, setRetranscribingId] = React.useState<number | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const deleteEntry = async (id: number) => {
        if (confirm(t.confirm_delete)) {
            await db.transcriptions.delete(id);
            toast.success("Recording deleted");
        }
    };

    const playAudio = async (entry: TranscriptionEntry) => {
        if (!entry.audioBlob) {
            toast.error('Audio data not found');
            return;
        }

        if (playingId === entry.id) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setPlayingId(null);
        } else {
            const url = URL.createObjectURL(entry.audioBlob);

            if (!audioRef.current) {
                audioRef.current = new Audio();
                audioRef.current.onended = () => setPlayingId(null);
            }

            audioRef.current.src = url;
            audioRef.current.play().catch(err => {
                console.error('Play error:', err);
                toast.error('Failed to play audio');
            });
            setPlayingId(entry.id || null);
        }
    };

    const blobToFloat32Array = async (blob: Blob): Promise<Float32Array> => {
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        
        // Resample to 16kHz if needed
        const sampleRate = audioBuffer.sampleRate;
        if (sampleRate !== 16000) {
            const { resample } = await import('wave-resampler');
            return new Float32Array(resample(rawData, sampleRate, 16000));
        }
        return new Float32Array(rawData);
    };

    const retranscribe = async (entry: TranscriptionEntry) => {
        if (!entry.audioBlob || !entry.id) {
            toast.error('Audio data not found');
            return;
        }

        setRetranscribingId(entry.id);
        try {
            const audioData = await blobToFloat32Array(entry.audioBlob);
            const engine = TranscriptionEngine.getInstance();

            await db.transcriptions.update(entry.id, { status: 'processing' });

            const result = await engine.transcribe(audioData, {
                model: `Xenova/whisper-${modelQuality}${primaryTranscriptionLanguage === 'en' ? '.en' : ''}`,
                language: primaryTranscriptionLanguage === 'auto' ? undefined : primaryTranscriptionLanguage,
                secondaryLanguage: secondaryTranscriptionLanguage || undefined,
            });

            const updatedEntry = {
                transcript: result.text,
                segments: clusterSegments(result.chunks).map(c => ({
                    speaker: c.speaker || 'Speaker 1',
                    text: c.text,
                    start: (c.timestamp?.[0]) || 0,
                    end: (c.timestamp?.[1]) || 0
                })),
                status: 'completed' as const
            };

            await db.transcriptions.update(entry.id, updatedEntry);
            toast.success('Transcription updated');
        } catch (error) {
            console.error('Retranscription error:', error);
            await db.transcriptions.update(entry.id, { status: 'error' });
            toast.error('Retranscription failed');
        } finally {
            setRetranscribingId(null);
        }
    };

    const exportTranscription = (entry: TranscriptionEntry) => {
        const content = `Title: ${entry.title}
Date: ${entry.date.toLocaleDateString()} ${entry.date.toLocaleTimeString()}
Duration: ${formatTime(entry.duration)}

FULL TRANSCRIPTION:
${entry.transcript}

${entry.segments && entry.segments.length > 0 ? `SEGMENTS BY SPEAKER:
${entry.segments.map(seg => `[${Math.floor(seg.start)}s - ${Math.floor(seg.end)}s] ${seg.speaker}: ${seg.text}`).join('\n')}` : ''}`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entry.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Transcription exported');
    };

    if (!entries) return <div className="text-center py-10">Loading...</div>;

    return (
        <>
            <div className="space-y-4 w-full">
                <h2 className="text-2xl font-bold mb-6">{t.transcription_history}</h2>
                {entries.length === 0 ? (
                    <GlassCard className="p-10 text-center">
                        <FileText className="mx-auto mb-4 text-taupe-grey/20" size={48} />
                        <p className="text-taupe-grey/60">{t.no_history}</p>
                    </GlassCard>
                ) : (
                    entries.map(entry => (
                        <GlassCard key={entry.id} className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{entry.title}</h3>
                                    <div className="flex gap-4 mt-1 text-xs text-taupe-grey/60 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} /> {entry.date.toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {formatTime(entry.duration)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase flex items-center gap-1 ${entry.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-600'}`}>
                                            {entry.status === 'processing' && <Loader2 size={10} className="animate-spin" />}
                                            {entry.status}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => deleteEntry(entry.id!)} className="p-2 text-taupe-grey/40 hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <p className="text-sm line-clamp-3 text-shadow-grey/80 dark:text-white/70 mb-4">
                                {entry.transcript}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                <GlassButton
                                    variant="ghost"
                                    className="text-xs py-1.5 h-auto"
                                    onClick={() => setModalEntry(entry)}
                                >
                                    <FileText size={14} /> View Full
                                </GlassButton>

                                <GlassButton
                                    variant="ghost"
                                    className="text-xs py-1.5 h-auto"
                                    onClick={() => playAudio(entry)}
                                    disabled={!entry.audioBlob}
                                >
                                    {playingId === entry.id ? <Pause size={14} /> : <Play size={14} />}
                                    {playingId === entry.id ? 'Playing' : 'Play'}
                                </GlassButton>

                                <GlassButton
                                    variant="ghost"
                                    className="text-xs py-1.5 h-auto"
                                    onClick={() => retranscribe(entry)}
                                    disabled={!entry.audioBlob || retranscribingId === entry.id}
                                >
                                    {retranscribingId === entry.id ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" /> Retranscribing
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={14} /> Retranscribe
                                        </>
                                    )}
                                </GlassButton>

                                <GlassButton variant="ghost" className="text-xs py-1.5 h-auto" onClick={() => exportTranscription(entry)}>
                                    <Download size={14} /> Export
                                </GlassButton>
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>

            <TranscriptionModal entry={modalEntry} onClose={() => setModalEntry(null)} />
        </>
    );
};
