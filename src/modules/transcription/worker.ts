
import { createModel, Model, KaldiRecognizer } from 'vosk-browser';

let models: Record<string, Model> = {};
let speakerModel: Model | null = null;
let recognizers: Record<string, KaldiRecognizer> = {};

async function loadModel(lang: string, modelUrl: string) {
    if (!models[lang]) {
        self.postMessage({ status: 'loading', message: `Loading Vosk model for ${lang}...` });
        models[lang] = await createModel(modelUrl);
    }
    return models[lang];
}

async function loadSpeakerModel(url: string) {
    if (!speakerModel) {
        self.postMessage({ status: 'loading', message: 'Loading Speaker Identification model...' });
        speakerModel = await createModel(url);
    }
    return speakerModel;
}

async function getRecognizer(lang: string, modelUrl: string, spkModelUrl: string, sampleRate: number) {
    if (!recognizers[lang]) {
        const model = await loadModel(lang, modelUrl);
        const spkModel = await loadSpeakerModel(spkModelUrl);
        // @ts-ignore - Vosk types can be tricky
        recognizers[lang] = new model.KaldiRecognizer(sampleRate, spkModel);
        recognizers[lang].setWords(true);
    }
    return recognizers[lang];
}

self.onmessage = async (e) => {
    const { audio, language, secondaryLanguage, modelUrls, speakerModelUrl, sampleRate, task_id } = e.data;

    try {
        const results: any[] = [];
        const lang1 = language || 'en';

        // Handle Egyptian Arabic - map ar-EG to ar for Vosk compatibility
        const voskLanguage = (lang1 === 'ar-EG' || lang1 === 'ar-eg') ? 'ar' : lang1;

        const url1 = modelUrls[voskLanguage];
        const spkUrl = speakerModelUrl;

        if (!url1) throw new Error(`Model URL for ${voskLanguage} not provided`);

        const rec1 = await getRecognizer(voskLanguage, url1, spkUrl, sampleRate || 16000);

        self.postMessage({ status: 'processing', task_id });

        const processAudio = async (recognizer: any, audioData: Float32Array) => {
            const segments = [];
            const CHUNK_SIZE = 4000;
            for (let i = 0; i < audioData.length; i += CHUNK_SIZE) {
                const chunk = audioData.slice(i, i + CHUNK_SIZE);
                if (recognizer.acceptWaveform(chunk)) {
                    const res = await recognizer.result();
                    if (res.text) segments.push(res);
                }
            }
            const final = await recognizer.finalResult();
            if (final.text) segments.push(final);
            return segments;
        };

        const segments1 = await processAudio(rec1, audio);
        results.push(...segments1.map(s => ({ ...s, lang: voskLanguage })));

        let combinedText = segments1.map(s => s.text).filter(Boolean).join(' ');

        if (secondaryLanguage && secondaryLanguage !== voskLanguage && modelUrls[secondaryLanguage]) {
            const lang2 = secondaryLanguage;
            const url2 = modelUrls[lang2];
            const rec2 = await getRecognizer(lang2, url2, spkUrl, sampleRate || 16000);
            const segments2 = await processAudio(rec2, audio);
            results.push(...segments2.map(s => ({ ...s, lang: lang2 })));

            const text2 = segments2.map(s => s.text).filter(Boolean).join(' ');
            if (text2) {
                combinedText += ' / ' + text2;
            }
        }

        self.postMessage({
            status: 'completed',
            task_id,
            result: {
                text: combinedText,
                chunks: results.flatMap(r => (r.result || []).map((c: any) => ({
                    timestamp: [c.start, c.end],
                    text: c.word,
                    spk: r.spk, // Include speaker vector from segment
                    speaker: r.spk ? 'Unknown' : r.lang
                })))
            }
        });

    } catch (error: any) {
        self.postMessage({
            status: 'error',
            task_id,
            error: error.message
        });
    }
};
