import initWasm, { PitchDetector } from '../wasm/panda_audio.js';

const wasmReady = initWasm();

const median = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
};

class RealtimeAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.detector = null;
        this.tolerance = 8;
        this.frameCounter = 0;

        this.energyEma = 0;
        this.lastOnsetAtMs = 0;
        this.onsetIntervals = [];
        this.lastTempoBpm = 0;
        this.noiseFloor = 0.0035;

        this.ready = wasmReady
            .then(() => {
                this.detector = new PitchDetector(sampleRate, this.bufferSize);
                this.detector.set_tune_tolerance(this.tolerance);
                this.detector.set_volume_threshold(this.noiseFloor);
                this.port.postMessage({ ready: true });
            })
            .catch((error) => {
                this.port.postMessage({ error: 'WASM init failed', detail: `${error}` });
            });

        this.port.onmessage = (event) => {
            const { type, value } = event.data || {};
            if (type === 'tolerance') {
                const next = Math.min(14, Math.max(3, Number(value) || this.tolerance));
                this.tolerance = next;
                if (this.detector) {
                    this.detector.set_tune_tolerance(this.tolerance);
                }
            }
            if (type === 'noiseFloor') {
                const next = Math.min(0.03, Math.max(0.001, Number(value) || this.noiseFloor));
                this.noiseFloor = next;
                if (this.detector) {
                    this.detector.set_volume_threshold(this.noiseFloor);
                }
            }
        };
    }

    detectOnset(volume, nowMs) {
        this.energyEma = this.energyEma ? (this.energyEma * 0.86 + volume * 0.14) : volume;
        const novelty = Math.max(0, volume - this.energyEma);
        const onsetStrength = novelty > 0.006 ? Math.min(1, novelty * 60) : 0;
        const hasOnset = onsetStrength > 0.35 && nowMs - this.lastOnsetAtMs > 90;

        if (hasOnset) {
            if (this.lastOnsetAtMs > 0) {
                const interval = nowMs - this.lastOnsetAtMs;
                if (interval >= 220 && interval <= 1500) {
                    this.onsetIntervals.push(interval);
                    if (this.onsetIntervals.length > 8) {
                        this.onsetIntervals.shift();
                    }
                }
            }
            this.lastOnsetAtMs = nowMs;
        }

        if (this.onsetIntervals.length >= 2) {
            const interval = median(this.onsetIntervals);
            const bpm = 60000 / interval;
            if (bpm >= 40 && bpm <= 220) {
                this.lastTempoBpm = bpm;
            }
        }

        return { hasOnset, onsetStrength };
    }

    getRhythmOffset(nowMs) {
        if (!this.lastTempoBpm || !this.lastOnsetAtMs) return 0;
        const beatInterval = 60000 / this.lastTempoBpm;
        const elapsed = nowMs - this.lastOnsetAtMs;
        const nearest = Math.round(elapsed / beatInterval) * beatInterval;
        return elapsed - nearest;
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const output = outputs[0];

        if (output && output[0]) {
            output[0].fill(0);
        }

        if (!input || !input[0] || !this.detector) return true;

        const channel = input[0];
        let offset = 0;
        while (offset < channel.length) {
            const space = this.bufferSize - this.bufferIndex;
            const count = Math.min(space, channel.length - offset);
            this.buffer.set(channel.subarray(offset, offset + count), this.bufferIndex);
            this.bufferIndex += count;
            offset += count;

            if (this.bufferIndex < this.bufferSize) continue;

            const result = this.detector.detect(this.buffer);
            const nowMs = currentTime * 1000;
            const onset = this.detectOnset(result.volume, nowMs);
            const tempoBpm = this.lastTempoBpm ? Math.round(this.lastTempoBpm * 10) / 10 : 0;
            const rhythmOffsetMs = this.getRhythmOffset(nowMs);

            this.frameCounter += 1;
            if (this.frameCounter % 2 === 0) {
                this.port.postMessage({
                    timestamp: nowMs,
                    frequency: result.frequency,
                    note: result.note,
                    cents: result.cents,
                    pitchCents: result.cents,
                    volume: result.volume,
                    inTune: result.in_tune,
                    confidence: result.confidence,
                    onset: onset.hasOnset,
                    onsetStrength: onset.onsetStrength,
                    tempoBpm,
                    rhythmOffsetMs,
                    hasSignal: result.volume >= this.noiseFloor,
                });
            }

            this.bufferIndex = 0;
        }

        return true;
    }
}

registerProcessor('rt-audio-processor', RealtimeAudioProcessor);

