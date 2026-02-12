
import { pipeline, env } from '@xenova/transformers';

// Skip local check for models (will fetch from HuggingFace and cache in browser)
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber: any = null;
let featureExtractor: any = null;

async function getTranscriber(model: string) {
    if (!transcriber || transcriber.modelName !== model) {
        self.postMessage({ status: 'loading', message: `Loading ${model}...` });
        transcriber = await pipeline('automatic-speech-recognition', model);
        transcriber.modelName = model;
    }
    return transcriber;
}

async function getFeatureExtractor() {
    if (!featureExtractor) {
        self.postMessage({ status: 'loading', message: 'Loading Speaker Recognition model...' });
        // Using WavLM for audio-based speaker embeddings
        featureExtractor = await pipeline('feature-extraction', 'Xenova/wavlm-base-plus-sv');
    }
    return featureExtractor;
}

self.onmessage = async (e) => {
    const { audio, model, language, secondaryLanguage, subtask, task_id } = e.data;

    try {
        const p = await getTranscriber(model);

        const options: any = {
            chunk_length_s: 30,
            stride_length_s: 5,
            task: 'transcribe',
            return_timestamps: true,
        };

        // If two languages are selected, we use auto-detection (Whisper's default)
        // If only one is selected, we force it.
        if (language && language !== 'auto' && !secondaryLanguage) {
            options.language = language;
        } else if (language === 'auto') {
            // Auto is already handled by not setting options.language
        }

        self.postMessage({ status: 'processing', task_id });

        const result = await p(audio, options);

        // If chunks are returned, we can try to get speaker embeddings for each chunk
        if (result.chunks && result.chunks.length > 0) {
            const extractor = await getFeatureExtractor();

            for (let i = 0; i < result.chunks.length; i++) {
                const chunk = result.chunks[i];
                if (!chunk.timestamp) continue;

                const [start, end] = chunk.timestamp;
                // Whisper uses 16000Hz internal sample rate
                const startSample = Math.floor(start * 16000);
                const endSample = Math.floor(end * 16000);
                const chunkAudio = audio.slice(startSample, endSample);

                if (chunkAudio.length > 1000) { // Only extract if chunk is significant
                    try {
                        // WavLM expects audio input
                        const out = await extractor(chunkAudio);
                        // Pooling over the time dimension (axis 1)
                        const embedding = out.mean(1);
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
