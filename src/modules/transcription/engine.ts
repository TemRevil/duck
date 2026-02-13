export interface TranscriptionResult {
    text: string;
    chunks: Array<{
        timestamp: [number, number];
        text: string;
        speaker?: string;
        confidence?: number;
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

    public async transcribe(audio: Float32Array, options: {
        language?: string;
        secondaryLanguage?: string;
        sampleRate?: number;
        onProgress?: (status: string) => void;
    }): Promise<TranscriptionResult> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const task_id = Math.random().toString(36).substring(7);

            // Default small models from alphacephei
            const modelUrls: Record<string, string> = {
                'en': 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
                'ar': 'https://alphacephei.com/vosk/models/vosk-model-ar-mgb2-0.4.zip',
                'fr': 'https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip',
                'de': 'https://alphacephei.com/vosk/models/vosk-model-small-de-0.15.zip',
                'es': 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip'
            };

            const handler = (e: MessageEvent) => {
                if (!e.data || typeof e.data !== 'object') return;

                const { status, task_id: response_id, result, error, message } = e.data;

                if (response_id !== task_id) return;

                if (status === 'loading' || status === 'processing') {
                    options.onProgress?.(message || status);
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
                language: options.language || 'en',
                secondaryLanguage: options.secondaryLanguage,
                modelUrls,
                speakerModelUrl: 'https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip',
                sampleRate: options.sampleRate || 16000,
                task_id
            });
        });
    }
}
