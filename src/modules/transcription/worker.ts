
import { pipeline, env, AutoProcessor, AutoModelForCTC } from '@xenova/transformers';

// Skip local check for models (will fetch from HuggingFace and cache in browser)
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber: any = null;
let featureExtractor: any = null;

async function getTranscriber(model: string) {
    console.log('=== GET TRANSCRIBER ===');
    console.log('Model requested:', model);
    console.log('Current transcriber:', { 
        exists: !!transcriber, 
        modelName: transcriber?.modelName,
        needsReload: !transcriber || transcriber.modelName !== model
    });

    if (!transcriber || transcriber.modelName !== model) {
        console.log('Loading new transcriber...');
        self.postMessage({ status: 'loading', message: `Loading ${model}...` });
        
        let error: any = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        // Try to load the requested model with retries
        while (attempts < maxAttempts && !transcriber) {
            attempts++;
            try {
                console.log(`Attempt ${attempts}/${maxAttempts}: Loading ${model}`);
                transcriber = await pipeline('automatic-speech-recognition', model);
                console.log('✓ Transcriber loaded successfully');
                transcriber.modelName = model;
                return transcriber;
            } catch (err) {
                error = err;
                console.error(`✗ Attempt ${attempts} failed:`, err);
                
                // Wait before retry
                if (attempts < maxAttempts) {
                    const waitTime = 1000 * Math.pow(2, attempts - 1); // Exponential backoff
                    console.log(`Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        // If all attempts failed and model is not English, try English model as fallback
        if (!transcriber && !model.includes('.en')) {
            console.warn('⚠️  Failed to load', model, '- attempting fallback to English model...');
            const englishModel = model.replace('-tiny', '-tiny.en').replace('-base', '-base.en').replace('-small', '-small.en') || 'Xenova/whisper-tiny.en';
            
            try {
                console.log('Loading fallback model:', englishModel);
                self.postMessage({ status: 'loading', message: `Loading ${englishModel} (fallback)...` });
                transcriber = await pipeline('automatic-speech-recognition', englishModel);
                console.log('✓ Fallback transcriber loaded successfully');
                transcriber.modelName = englishModel;
                self.postMessage({ status: 'loading', message: 'Note: Using English model as fallback' });
                return transcriber;
            } catch (fallbackErr) {
                console.error('✗ Fallback model also failed:', fallbackErr);
                throw new Error(`Failed to load model ${model}: ${error?.message || 'Unknown error'}`);
            }
        }
        
        if (!transcriber) {
            throw error || new Error('Failed to load transcriber');
        }
    }
    console.log('Returning transcriber');
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
        const audioData = audio as Float32Array;
        console.log('\n=== WORKER MESSAGE RECEIVED ===');
        console.log('Task ID:', task_id);
        console.log('Worker received audio:', {
            audioLength: audioData?.length,
            audioType: audioData?.constructor?.name,
            model,
            language,
            task_id
        });

        // Handle Egyptian Arabic - map ar-EG to ar for Whisper compatibility
        let whisperLanguage = language;
        if (language === 'ar-EG' || language === 'ar-eg') {
            console.log('📍 Egyptian Arabic detected - Note: Whisper will use Modern Standard Arabic (MSA) as Egyptian dialect is not natively supported');
            whisperLanguage = 'ar';
        }

        // Validate audio data
        if (audioData && audioData.length > 0) {
            const sampleSize = Math.min(1000, audioData.length);
            const samples = Array.from(audioData.slice(0, sampleSize));
            const max = Math.max(...samples.map(Math.abs));
            const min = Math.min(...samples.map(Math.abs));
            const mean = samples.reduce((a, b) => a + Math.abs(b), 0) / sampleSize;
            console.log('Audio metrics:', { max, min, mean, samplesChecked: sampleSize });
            
            if (max < 0.001) {
                console.warn('⚠️  WARNING: Audio amplitude is VERY low (max:', max, ') - likely silent');
            }
        }

        console.log('\n=== LOADING TRANSCRIBER ===');
        const p = await getTranscriber(model);
        console.log('✓ Transcriber loaded');

        self.postMessage({ status: 'processing', task_id });

        console.log('\n=== STARTING TRANSCRIPTION ===');
        console.log('Audio length:', audioData.length);
        console.log('Model:', model);
        console.log('Language:', whisperLanguage);
        
        let result;
        try {
            console.log('Calling transcriber pipeline with audio only...');
            // Try calling with just audio first - no options
            result = await p(audioData);
            console.log('✓ Transcription succeeded');
        } catch (err1) {
            console.error('First attempt failed:', err1);
            try {
                console.log('Retrying with minimal options...');
                // Fallback: try with only language option
                const minimalOpts: any = {};
                if (whisperLanguage && whisperLanguage !== 'auto') {
                    minimalOpts.language = whisperLanguage;
                }
                result = await p(audioData, minimalOpts);
                console.log('✓ Transcription succeeded with minimal options');
            } catch (err2) {
                console.error('Second attempt also failed:', err2);
                throw err2;
            }
        }
        
        console.log('\n=== TRANSCRIPTION COMPLETE ===');
        console.log('Result:', result);
        console.log('Result.text:', result?.text);
        console.log('Result.chunks length:', result?.chunks ? result.chunks.length : 0);
        
        // Always ensure we have text field
        if (result && !result.text && result.chunks && result.chunks.length > 0) {
            result.text = result.chunks.map((c: any) => c.text || '').join(' ').trim();
        }
        
        if (!result.text) {
            result.text = '';
        }
        
        console.log('Final text:', result.text);

        // If chunks are returned, process embeddings
        if (result.chunks && result.chunks.length > 0) {
            console.log('Processing', result.chunks.length, 'chunks for embeddings...');
            try {
                const extractor = await getFeatureExtractor();
                for (let i = 0; i < result.chunks.length; i++) {
                    const chunk = result.chunks[i];
                    if (!chunk.timestamp) continue;

                    const [start, end] = chunk.timestamp;
                    const startSample = Math.floor(start * 16000);
                    const endSample = Math.floor(end * 16000);
                    const chunkAudio = audioData.slice(startSample, endSample);

                    if (chunkAudio.length > 1000) {
                        try {
                            const out = await extractor(chunkAudio);
                            const embedding = out.mean(1);
                            chunk.embedding = Array.from(embedding.data);
                        } catch (e) {
                            console.error("Embedding error for chunk", i, e);
                        }
                    }
                }
            } catch (embedErr) {
                console.log('Skipping embeddings due to error:', embedErr);
            }
        }

        console.log('\n=== SENDING RESULT ===');
        self.postMessage({
            status: 'completed',
            task_id,
            result: result
        });

    } catch (error: any) {
        console.error('\n=== WORKER FATAL ERROR ===');
        console.error('Error:', error?.message || error);
        console.error('Type:', error?.constructor?.name);
        
        self.postMessage({
            status: 'error',
            task_id,
            error: error?.message || 'Unknown error'
        });
    }
};
