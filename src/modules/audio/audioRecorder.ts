
import { resample } from 'wave-resampler';

export class AudioRecorder {
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private audioData: Float32Array[] = [];
    private onDataCallback: ((data: Float32Array) => void) | null = null;

    async start(onData?: (data: Float32Array) => void) {
        this.audioData = [];
        this.onDataCallback = onData || null;

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new AudioContext();
        this.source = this.audioContext.createMediaStreamSource(this.stream);

        // ScriptProcessor is deprecated but widely supported and easier for this task
        // than AudioWorklet in a quick implementation.
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const copy = new Float32Array(inputData);
            this.audioData.push(copy);
            if (this.onDataCallback) {
                this.onDataCallback(copy);
            }
        };
    }

    async stop(): Promise<Float32Array> {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            await this.audioContext.close();
            const sampleRate = this.audioContext.sampleRate;
            this.audioContext = null;

            // Merge all chunks
            const merged = this.mergeChunks(this.audioData);

            // Resample to 16kHz for Whisper
            if (sampleRate !== 16000) {
                return this.resampleAudio(merged, sampleRate, 16000);
            }
            return merged;
        }
        return new Float32Array(0);
    }

    private mergeChunks(chunks: Float32Array[]): Float32Array {
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    }

    private resampleAudio(audio: Float32Array, fromRate: number, toRate: number): Float32Array {
        const resampled = resample(audio, fromRate, toRate);
        return new Float32Array(resampled);
    }

    public getFullAudio(currentSampleRate: number): Float32Array {
        const merged = this.mergeChunks(this.audioData);
        if (currentSampleRate !== 16000) {
             return this.resampleAudio(merged, currentSampleRate, 16000);
        }
        return merged;
    }
}
