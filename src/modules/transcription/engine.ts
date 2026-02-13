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
        return new Promise(async (resolve, reject) => {
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

            // Chunk audio to prevent stack overflow and provide better progress
            const CHUNK_DURATION = 30; // 30 seconds
            const SAMPLE_RATE = options.sampleRate || 16000;
            const chunkSize = CHUNK_DURATION * SAMPLE_RATE;
            const chunks: Float32Array[] = [];

            for (let i = 0; i < audio.length; i += chunkSize) {
                chunks.push(audio.slice(i, Math.min(i + chunkSize, audio.length)));
            }

            let allResults: TranscriptionResult = {
                text: '',
                chunks: []
            };

            // Process chunks sequentially
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const chunk = chunks[chunkIdx];
                const chunk_task_id = `${task_id}_chunk_${chunkIdx}`;

                if (options && typeof options.onProgress === 'function') {
                    options.onProgress(`Processing chunk ${chunkIdx + 1}/${chunks.length}...`);
                }

                try {
                    const chunkResult = await new Promise<TranscriptionResult>((resolveChunk, rejectChunk) => {
                        const timeout = setTimeout(() => {
                            rejectChunk(new Error(`Chunk ${chunkIdx} timeout`));
                        }, 120000);

                        const chunkHandler = (e: MessageEvent) => {
                            if (!e.data || typeof e.data !== 'object') return;

                            const { status, task_id: response_id, result, error, message } = e.data;

                            if (response_id !== chunk_task_id) return;

                            if (status === 'loading' || status === 'processing') {
                                options.onProgress?.(message || status);
                            } else if (status === 'completed') {
                                clearTimeout(timeout);
                                this.worker?.removeEventListener('message', chunkHandler);
                                resolveChunk(result);
                            } else if (status === 'error') {
                                clearTimeout(timeout);
                                this.worker?.removeEventListener('message', chunkHandler);
                                rejectChunk(new Error(error || 'Chunk processing error'));
                            }
                        };

                        this.worker!.addEventListener('message', chunkHandler);

                        this.worker!.postMessage({
                            audio: chunk,
                            language: options.language || 'en',
                            secondaryLanguage: options.secondaryLanguage,
                            modelUrls,
                            speakerModelUrl: 'https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip',
                            sampleRate: SAMPLE_RATE,
                            task_id: chunk_task_id
                        });
                    });

                    // Merge chunk results
                    if (chunkResult.text) {
                        allResults.text += (allResults.text ? ' ' : '') + chunkResult.text;
                    }
                    if (chunkResult.chunks && chunkResult.chunks.length > 0) {
                        const timeOffset = chunkIdx * CHUNK_DURATION;
                        const adjustedChunks = chunkResult.chunks.map(c => ({
                            ...c,
                            timestamp: [
                                (c.timestamp[0] || 0) + timeOffset,
                                (c.timestamp[1] || 0) + timeOffset
                            ] as [number, number]
                        }));
                        allResults.chunks.push(...adjustedChunks);
                    }

                } catch (error) {
                    console.error(`Chunk ${chunkIdx} failed:`, error);
                    if (chunks.length === 1) {
                        reject(error);
                        return;
                    }
                }
            }

            resolve(allResults);
        });
    }
}
