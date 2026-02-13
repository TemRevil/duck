
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
        const url1 = modelUrls[lang1];
        const spkUrl = speakerModelUrl;

        if (!url1) throw new Error(`Model URL for ${lang1} not provided`);

        const rec1 = await getRecognizer(lang1, url1, spkUrl, sampleRate || 16000);

        self.postMessage({ status: 'processing', task_id });

        // Process audio
        // @ts-ignore
        rec1.acceptWaveform(audio);
        // @ts-ignore
        const res1 = await rec1.finalResult();
        results.push({ lang: lang1, ...res1 });

        if (secondaryLanguage && secondaryLanguage !== lang1 && modelUrls[secondaryLanguage]) {
            const lang2 = secondaryLanguage;
            const url2 = modelUrls[lang2];
            const rec2 = await getRecognizer(lang2, url2, spkUrl, sampleRate || 16000);
            // @ts-ignore
            rec2.acceptWaveform(audio);
            // @ts-ignore
            const res2 = await rec2.finalResult();
            results.push({ lang: lang2, ...res2 });
        }

        // Merge results (simple merge for now, prioritizing lang1)
        const combinedText = results.map(r => r.text).join(' / ');

        self.postMessage({
            status: 'completed',
            task_id,
            result: {
                text: combinedText,
                chunks: results.flatMap(r => (r.result || []).map((c: any) => ({
                    timestamp: [c.start, c.end],
                    text: c.word,
                    speaker: r.spk_frames ? `Speaker (${r.lang})` : r.lang
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
