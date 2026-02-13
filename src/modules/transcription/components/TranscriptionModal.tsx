import React from 'react';
import { X } from 'lucide-react';
import { TranscriptionEntry } from '../store/db';

interface TranscriptionModalProps {
    entry: TranscriptionEntry | null;
    onClose: () => void;
}

export const TranscriptionModal: React.FC<TranscriptionModalProps> = ({ entry, onClose }) => {
    if (!entry) return null;

    // Handle date that might be stored as Date or need conversion
    const getDate = () => {
        if (!entry.date) return 'Unknown date';
        const date = entry.date instanceof Date ? entry.date : new Date(entry.date);
        return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-taupe-grey/10 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">{entry.title}</h2>
                        <p className="text-sm text-taupe-grey/60 mt-1">
                            {getDate()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-taupe-grey/10 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Full Transcript */}
                    <div>
                        <h3 className="font-bold text-lg mb-3">Full Transcription</h3>
                        {entry.transcript ? (
                            <div className="bg-taupe-grey/5 dark:bg-white/5 rounded-lg p-4 text-sm leading-relaxed text-shadow-grey/80 dark:text-white/70 whitespace-pre-wrap break-words">
                                {entry.transcript}
                            </div>
                        ) : (
                            <div className="bg-taupe-grey/5 dark:bg-white/5 rounded-lg p-4 text-sm text-taupe-grey/60">
                                No transcript available
                            </div>
                        )}
                    </div>

                    {/* Segments */}
                    {entry.segments && entry.segments.length > 0 && (
                        <div>
                            <h3 className="font-bold text-lg mb-3">Segments by Speaker</h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {entry.segments.map((seg, i) => {
                                    // Map speaker names to consistent colors
                                    const speakerColors: Record<string, string> = {
                                        'Speaker 1': 'text-tropical-teal',
                                        'Speaker 2': 'text-amber-500',
                                        'Speaker 3': 'text-purple-500',
                                        'Speaker 4': 'text-rose-500',
                                        'Speaker 5': 'text-indigo-500',
                                        'Speaker 6': 'text-emerald-500'
                                    };

                                    const speakerColor = speakerColors[seg.speaker] || 'text-tropical-teal';
                                    const speakerBg = speakerColor.replace('text-', 'bg-').replace('500', '500/10');

                                    return (
                                        <div key={i} className={`rounded-lg p-4 border-l-4 ${speakerBg} border-current ${speakerColor}`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`text-xs font-bold uppercase ${speakerColor}`}>
                                                    {seg.speaker}
                                                </span>
                                                <span className="text-xs opacity-50 font-mono">
                                                    {Math.floor(seg.start)}s - {Math.floor(seg.end)}s
                                                </span>
                                            </div>
                                            <p className="text-sm text-shadow-grey/80 dark:text-white/90 leading-relaxed font-medium">
                                                {seg.text}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
