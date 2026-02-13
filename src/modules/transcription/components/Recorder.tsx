
import React from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { GlassButton, GlassCard } from '../../../components/ui';
import { useLiveTranscription } from '../hooks/useLiveTranscription';
import { useRecordingStore } from '../store/recordingStore';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { translations } from '../../../utils/translations';

export const Recorder: React.FC = () => {
    const { isRecording, transcript, interimTranscript, status, isProcessing, startRecording, stopRecording, isRecordingActive, isProcessingActive } = useLiveTranscription();
    const { language } = useSettingsStore();
    const t = translations[language];

    // Use global state to determine if recording/processing is happening anywhere in the app
    const canStartRecording = !isRecordingActive && !isProcessingActive;

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col items-center justify-center p-12 glass-card-solid bg-gradient-to-b from-white/50 to-white/30 dark:from-white/10 dark:to-white/5 border-dashed border-2 border-tropical-teal/30">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isRecording ? 'bg-red-500 animate-pulse scale-110 shadow-lg shadow-red-500/30' : isProcessing ? 'bg-amber-500 animate-pulse scale-105 shadow-lg shadow-amber-500/30' : 'bg-tropical-teal shadow-lg shadow-tropical-teal/20'}`}>
                    {isRecording ? <Square className="text-white fill-white" size={32} /> : isProcessing ? <Loader2 className="text-white animate-spin" size={32} /> : <Mic className="text-white" size={32} />}
                </div>

                <h3 className="text-xl font-bold mb-2">
                    {isRecording ? t.listening : isProcessing ? 'Processing...' : t.start_recording}
                </h3>
                <p className="text-sm text-taupe-grey/60 mb-8">
                    {status || (isProcessing ? 'Finalizing transcription...' : !canStartRecording ? 'A session is already in progress...' : 'Click to start transcription')}
                </p>

                <div className="flex gap-4">
                    {!isRecording && !isProcessing ? (
                        <GlassButton
                            variant="primary"
                            onClick={startRecording}
                            disabled={!canStartRecording}
                            className={`px-8 py-4 text-lg ${!canStartRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Mic size={20} /> {t.record}
                        </GlassButton>
                    ) : isRecording && !isProcessing ? (
                        <GlassButton onClick={stopRecording} className="px-8 py-4 text-lg bg-red-500 text-white border-none hover:bg-red-600">
                            <Square size={20} /> Stop
                        </GlassButton>
                    ) : (
                        <GlassButton disabled className="px-8 py-4 text-lg bg-amber-500 text-white border-none opacity-60">
                            <Loader2 size={20} className="animate-spin" /> Processing
                        </GlassButton>
                    )}
                </div>
            </div>

            {(transcript || interimTranscript || isRecording || isProcessing) && (
                <GlassCard className="p-6 min-h-[200px]">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-lg">Live Transcription</h4>
                        {isRecording && <div className="flex items-center gap-2 text-tropical-teal text-xs font-bold animate-pulse">
                            <Loader2 size={14} className="animate-spin" /> Live
                        </div>}
                        {isProcessing && <div className="flex items-center gap-2 text-amber-600 text-xs font-bold animate-pulse">
                            <Loader2 size={14} className="animate-spin" /> Finalizing
                        </div>}
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {isRecording || isProcessing ? (
                            <div className="space-y-4">
                                {(transcript || interimTranscript) && <p className="opacity-60">{transcript || interimTranscript}</p>}
                                {isRecording && <p>{interimTranscript && !transcript ? interimTranscript : 'Waiting for speech...'}</p>}
                                {isProcessing && <p className="text-amber-600">Saving transcription...</p>}
                            </div>
                        ) : (
                            transcript || 'No transcript available'
                        )}
                    </div>
                </GlassCard>
            )}
        </div>
    );
};
