import initWasm, { PitchDetector } from '../wasm/panda_audio.js';

const wasmReady = initWasm();

class TunerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.detector = null;
        this.ready = wasmReady.then(() => {
            this.detector = new PitchDetector(sampleRate, this.bufferSize);
            this.detector.set_tune_tolerance(8);
            this.detector.set_volume_threshold(0.01);
            this.port.postMessage({ ready: true });
        }).catch((error) => {
            this.port.postMessage({ error: 'WASM init failed', detail: `${error}` });
        });
        this.frameCounter = 0;
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];
        if (output && output[0]) {
            output[0].fill(0);
        }
        if (!input || !input[0]) {
            return true;
        }

        if (!this.detector) {
            return true;
        }

        const channel = input[0];
        const length = channel.length;
        let offset = 0;
        while (offset < length) {
            const space = this.bufferSize - this.bufferIndex;
            const copyCount = Math.min(space, length - offset);
            this.buffer.set(channel.subarray(offset, offset + copyCount), this.bufferIndex);
            this.bufferIndex += copyCount;
            offset += copyCount;

            if (this.bufferIndex >= this.bufferSize) {
                const result = this.detector.detect(this.buffer);
                this.frameCounter += 1;
                if (this.frameCounter % 3 === 0) {
                    this.port.postMessage({
                        frequency: result.frequency,
                        note: result.note,
                        cents: result.cents,
                        volume: result.volume,
                        inTune: result.in_tune,
                        confidence: result.confidence,
                    });
                }
                this.bufferIndex = 0;
            }
        }

        return true;
    }
}

registerProcessor('tuner-processor', TunerProcessor);
