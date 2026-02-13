
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
        return new Promise(async (resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not initialized'));
                return;
            }

            const task_id = Math.random().toString(36).substring(7);

            console.log('=== ENGINE.TRANSCRIBE ===');
            console.log('Task ID:', task_id);
            console.log('Audio info:', {
                length: audio.length,
                duration: audio.length / 16000,
                type: audio.constructor.name,
                isFloat32Array: audio instanceof Float32Array
            });
            console.log('Options:', options);

            // Chunk audio to prevent stack overflow with large audio
            const CHUNK_DURATION = 30; // 30 seconds
            const SAMPLE_RATE = 16000;
            const chunkSize = CHUNK_DURATION * SAMPLE_RATE;
            const chunks: Float32Array[] = [];
            
            for (let i = 0; i < audio.length; i += chunkSize) {
                chunks.push(audio.slice(i, Math.min(i + chunkSize, audio.length)));
            }

            console.log(`Chunked audio into ${chunks.length} chunk(s)`, {
                totalDuration: audio.length / SAMPLE_RATE,
                chunkDuration: CHUNK_DURATION,
            });

            let allResults: TranscriptionResult = {
                text: '',
                chunks: []
            };

            // Process chunks sequentially
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const chunk = chunks[chunkIdx];
                const chunk_task_id = `${task_id}_chunk_${chunkIdx}`;

                console.log(`\n=== PROCESSING CHUNK ${chunkIdx + 1}/${chunks.length} ===`);
                console.log('Duration:', chunk.length / SAMPLE_RATE, 'seconds');

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
                                console.log(`Chunk ${chunkIdx} [${status}]:`, message || status);
                            } else if (status === 'completed') {
                                console.log(`Chunk ${chunkIdx} completed:`, {
                                    textLength: result?.text?.length || 0,
                                    chunks: result?.chunks?.length || 0,
                                    text: result?.text
                                });
                                clearTimeout(timeout);
                                this.worker?.removeEventListener('message', chunkHandler);
                                resolveChunk(result);
                            } else if (status === 'error') {
                                console.error(`Chunk ${chunkIdx} error:`, error);
                                clearTimeout(timeout);
                                this.worker?.removeEventListener('message', chunkHandler);
                                rejectChunk(new Error(error || 'Chunk processing error'));
                            }
                        };

                        this.worker!.addEventListener('message', chunkHandler);

                        const messagePayload = {
                            audio: chunk,
                            model: options.model || 'Xenova/whisper-tiny.en',
                            language: options.language,
                            secondaryLanguage: options.secondaryLanguage,
                            task_id: chunk_task_id
                        };

                        console.log(`Posting chunk ${chunkIdx} to worker...`);
                        this.worker!.postMessage(messagePayload);
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
                    // Check if it's a network/fetch error - might be fallback triggered
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    if (errorMsg.includes('Failed to fetch')) {
                        console.log('Network error - worker may be attempting fallback to English model');
                    }
                    if (chunks.length === 1) {
                        // If single chunk fails, propagate error
                        reject(error);
                        return;
                    }
                    // Continue with remaining chunks if multiple chunks
                }
            }

            console.log('\n=== ALL CHUNKS PROCESSED ===');
            console.log('Final result:', {
                textLength: allResults.text.length,
                text: allResults.text,
                chunks: allResults.chunks.length
            });

            resolve(allResults);
        });
    }
}
