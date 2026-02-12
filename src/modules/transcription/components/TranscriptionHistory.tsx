
import React from 'react';
import { db } from '../store/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { GlassCard, GlassButton } from '../../../components/ui';
import { Calendar, Clock, Trash2, FileText, Download, Loader2 } from 'lucide-react';
import { formatTime } from '../../../utils';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { translations } from '../../../utils/translations';
import { toast } from 'react-hot-toast';

export const TranscriptionHistory: React.FC = () => {
    const entries = useLiveQuery(() => db.transcriptions.orderBy('date').reverse().toArray());
    const { language } = useSettingsStore();
    const t = translations[language];
    const [expandedId, setExpandedId] = React.useState<number | null>(null);

    const deleteEntry = async (id: number) => {
        if (confirm(t.confirm_delete)) {
            await db.transcriptions.delete(id);
            toast.success("Recording deleted");
        }
    };

    if (!entries) return <div className="text-center py-10">Loading...</div>;

    return (
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
                        {expandedId === entry.id ? (
                            <div className="space-y-4 mt-4 border-t border-taupe-grey/10 pt-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {entry.segments?.map((seg, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="min-w-[80px] text-[10px] font-bold text-tropical-teal uppercase pt-1">
                                            {seg.speaker}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-shadow-grey/80 dark:text-white/70">{seg.text}</p>
                                            <span className="text-[10px] text-taupe-grey/40">{formatTime(seg.start)} - {formatTime(seg.end)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm line-clamp-3 text-shadow-grey/80 dark:text-white/70">
                                {entry.transcript}
                            </p>
                        )}
                        <div className="flex gap-2 mt-4">
                            <GlassButton
                                variant="ghost"
                                className="text-xs py-1.5 h-auto"
                                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id!)}
                            >
                                <FileText size={14} /> {expandedId === entry.id ? 'Show Less' : 'View Segments'}
                            </GlassButton>
                            <GlassButton variant="ghost" className="text-xs py-1.5 h-auto">
                                <Download size={14} /> Export
                            </GlassButton>
                        </div>
                    </GlassCard>
                ))
            )}
        </div>
    );
};
