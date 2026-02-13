import { create } from 'zustand';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

interface RecordingState {
    // Global recording lock
    isRecordingActive: boolean;
    isProcessingActive: boolean;
    currentStatus: RecordingStatus;
    statusMessage: string;
    currentDbId: string | null;
    errorMessage: string | null;

    // Actions
    startSession: (dbId: string) => void;
    updateStatus: (status: RecordingStatus, message: string) => void;
    setErrorMessage: (message: string | null) => void;
    completeSession: () => void;
    resetSession: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
    isRecordingActive: false,
    isProcessingActive: false,
    currentStatus: 'idle',
    statusMessage: '',
    currentDbId: null,
    errorMessage: null,

    startSession: (dbId: string) =>
        set({
            isRecordingActive: true,
            isProcessingActive: false,
            currentStatus: 'recording',
            statusMessage: 'Listening...',
            currentDbId: dbId,
            errorMessage: null,
        }),

    updateStatus: (status: RecordingStatus, message: string) =>
        set({
            currentStatus: status,
            statusMessage: message,
            isRecordingActive: status === 'recording',
            isProcessingActive: status === 'processing',
        }),

    setErrorMessage: (message: string | null) =>
        set({
            errorMessage: message,
            currentStatus: message ? 'error' : 'idle',
        }),

    completeSession: () =>
        set({
            isRecordingActive: false,
            isProcessingActive: false,
            currentStatus: 'idle',
            statusMessage: 'Completed',
            currentDbId: null,
        }),

    resetSession: () =>
        set({
            isRecordingActive: false,
            isProcessingActive: false,
            currentStatus: 'idle',
            statusMessage: '',
            currentDbId: null,
            errorMessage: null,
        }),
}));
