
import { pipeline, env } from '@xenova/transformers';

// Skip local check for models (will fetch from HuggingFace and cache in browser)
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber: any = null;
let featureExtractor: any = null;

async function getTranscriber(model: string) {
    if (!transcriber || transcriber.model !== model) {
        self.postMessage({ status: 'loading', message: `Loading ${model}...` });
        transcriber = await pipeline('automatic-speech-recognition', model);
        transcriber.model = model;
    }
    return transcriber;
}

async function getFeatureExtractor() {
    if (!featureExtractor) {
        self.postMessage({ status: 'loading', message: 'Loading Speaker Recognition model...' });
        featureExtractor = await pipeline('feature-extraction', 'Xenova/facenet-embeddings'); // Using a general purpose embedding model or specific speaker model
    }
    return featureExtractor;
}

self.onmessage = async (e) => {
    const { audio, model, language, subtask, task_id } = e.data;

    try {
        const p = await getTranscriber(model);

        const options: any = {
            chunk_length_s: 30,
            stride_length_s: 5,
            task: 'transcribe',
            return_timestamps: true,
        };

        if (language && language !== 'auto') {
            options.language = language;
        }

        self.postMessage({ status: 'processing', task_id });

        const result = await p(audio, options);

        // If chunks are returned, we can try to get speaker embeddings for each chunk
        if (result.chunks && result.chunks.length > 0) {
            const extractor = await getFeatureExtractor();

            for (let i = 0; i < result.chunks.length; i++) {
                const chunk = result.chunks[i];
                const [start, end] = chunk.timestamp;
                const startSample = Math.floor(start * 16000);
                const endSample = Math.floor(end * 16000);
                const chunkAudio = audio.slice(startSample, endSample);

                if (chunkAudio.length > 1000) { // Only extract if chunk is significant
                    try {
                        const embedding = await extractor(chunkAudio, { pooling: 'mean', normalize: true });
                        chunk.embedding = Array.from(embedding.data);
                    } catch (e) {
                        console.error("Embedding error", e);
                    }
                }
            }
        }

        self.postMessage({
            status: 'completed',
            task_id,
            result: result
        });

    } catch (error: any) {
        self.postMessage({
            status: 'error',
            task_id,
            error: error.message
        });
    }
};
