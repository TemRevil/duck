import React from 'react';
import { useRecordingStore } from '../store/recordingStore';
import { Loader2, Mic, AlertCircle } from 'lucide-react';
import { GlassCard } from '../../../components/ui';

export const RecordingIndicator: React.FC = () => {
    const { isRecordingActive, isProcessingActive, currentStatus, statusMessage, errorMessage } = useRecordingStore();

    // Don't show if idle
    if (currentStatus === 'idle') {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-6 right-6 z-50 md:left-auto md:right-6 md:max-w-sm">
            <GlassCard className={`p-4 flex items-center gap-3 ${
                currentStatus === 'error' ? 'bg-red-500/10 border-red-500/30' :
                isProcessingActive ? 'bg-amber-500/10 border-amber-500/30' :
                'bg-tropical-teal/10 border-tropical-teal/30'
            }`}>
                <div className={`flex-shrink-0 ${
                    currentStatus === 'error' ? 'text-red-500' :
                    isProcessingActive ? 'text-amber-500' :
                    'text-tropical-teal'
                }`}>
                    {currentStatus === 'error' ? (
                        <AlertCircle size={20} />
                    ) : isProcessingActive ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <Mic size={20} className={isRecordingActive ? 'animate-pulse' : ''} />
                    )}
                </div>
                
                <div className="flex-1">
                    <div className={`text-sm font-semibold ${
                        currentStatus === 'error' ? 'text-red-600' :
                        isProcessingActive ? 'text-amber-600' :
                        'text-tropical-teal'
                    }`}>
                        {currentStatus === 'error' ? 'Recording Error' :
                         isProcessingActive ? 'Processing...' :
                         isRecordingActive ? 'Recording...' : 'Session Active'}
                    </div>
                    <div className="text-xs text-taupe-grey/60 mt-0.5">
                        {errorMessage || statusMessage || 'Working in background...'}
                    </div>
                </div>

                {currentStatus === 'error' && (
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-shrink-0 text-xs text-red-600 hover:text-red-700 underline"
                    >
                        Dismiss
                    </button>
                )}
            </GlassCard>
        </div>
    );
};
