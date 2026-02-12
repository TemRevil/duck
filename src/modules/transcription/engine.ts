
export interface TranscriptionResult {
    text: string;
    chunks: Array<{
        timestamp: [number, number];
        text: string;
        speaker?: string;
        embedding?: number[];
    }>;
}

export class TranscriptionEngine {
    private worker: Worker | null = null;
    private static instance: TranscriptionEngine;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
                type: 'module'
            });
        }
    }

    public static getInstance(): TranscriptionEngine {
        if (!TranscriptionEngine.instance) {
            TranscriptionEngine.instance = new TranscriptionEngine();
        }
        return TranscriptionEngine.instance;
    }

    public transcribe(audio: Float32Array, options: {
        model?: string;
        language?: string;
        secondaryLanguage?: string;
        onProgress?: (status: string) => void;
    }): Promise<TranscriptionResult> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const task_id = Math.random().toString(36).substring(7);

            const handler = (e: MessageEvent) => {
                // Defensive check for e.data
                if (!e.data || typeof e.data !== 'object') return;

                const { status, task_id: response_id, result, error, message } = e.data;

                if (response_id !== task_id) return;

                if (status === 'loading' || status === 'processing') {
                    if (options && typeof options.onProgress === 'function') {
                        options.onProgress(message || status);
                    }
                } else if (status === 'completed') {
                    this.worker?.removeEventListener('message', handler);
                    resolve(result);
                } else if (status === 'error') {
                    this.worker?.removeEventListener('message', handler);
                    reject(new Error(error || 'Unknown worker error'));
                }
            };

            this.worker.addEventListener('message', handler);

            this.worker.postMessage({
                audio,
                model: options.model || 'Xenova/whisper-tiny.en',
                language: options.language,
                secondaryLanguage: options.secondaryLanguage,
                task_id
            });
        });
    }
}
