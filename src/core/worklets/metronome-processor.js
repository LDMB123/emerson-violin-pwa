class MetronomeProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bpm = 100;
        this.subdivision = 1;
        this.beatsPerMeasure = 4;
        this.accentEnabled = true;
        this.running = false;
        this.tickIndex = 0;
        this.samplesPerTick = this.computeSamplesPerTick();
        this.samplesUntilNextTick = 0;
        this.countInRemaining = 0;
        this.countInActive = false;
        this.clickState = null;

        this.port.onmessage = (event) => {
            const data = event.data || {};
            if (data.type === 'config') {
                this.applyConfig(data);
            }
            if (data.type === 'start') {
                this.start(Boolean(data.countIn));
            }
            if (data.type === 'stop') {
                this.stop();
            }
        };
    }

    computeSamplesPerTick() {
        const bpm = Math.max(1, this.bpm);
        const subdivision = Math.max(1, this.subdivision);
        return (sampleRate * 60) / (bpm * subdivision);
    }

    applyConfig(data) {
        const nextBpm = Number(data.bpm);
        if (Number.isFinite(nextBpm) && nextBpm > 0) {
            this.bpm = nextBpm;
        }
        const nextSubdivision = Number(data.subdivision);
        if (Number.isFinite(nextSubdivision) && nextSubdivision > 0) {
            this.subdivision = Math.max(1, Math.round(nextSubdivision));
        }
        const nextBeats = Number(data.beatsPerMeasure);
        if (Number.isFinite(nextBeats) && nextBeats > 0) {
            this.beatsPerMeasure = Math.max(1, Math.round(nextBeats));
        }
        if (typeof data.accentEnabled === 'boolean') {
            this.accentEnabled = data.accentEnabled;
        }
        this.samplesPerTick = this.computeSamplesPerTick();
    }

    start(useCountIn) {
        this.running = true;
        this.tickIndex = 0;
        this.samplesPerTick = this.computeSamplesPerTick();
        this.samplesUntilNextTick = 0;
        this.countInRemaining = useCountIn ? this.beatsPerMeasure : 0;
        this.countInActive = this.countInRemaining > 0;
    }

    stop() {
        this.running = false;
        this.tickIndex = 0;
        this.samplesUntilNextTick = 0;
        this.countInRemaining = 0;
        this.countInActive = false;
        this.clickState = null;
    }

    triggerClick(kind) {
        let frequency = 820;
        let gain = 0.17;
        let duration = 0.08;
        if (kind === 'accent') {
            frequency = 980;
            gain = 0.24;
            duration = 0.09;
        } else if (kind === 'sub') {
            frequency = 640;
            gain = 0.1;
            duration = 0.05;
        }

        const totalSamples = Math.max(1, Math.round(duration * sampleRate));
        this.clickState = {
            remaining: totalSamples,
            total: totalSamples,
            phase: 0,
            phaseInc: (Math.PI * 2 * frequency) / sampleRate,
            gain,
        };
    }

    renderClickSample() {
        if (!this.clickState || this.clickState.remaining <= 0) {
            this.clickState = null;
            return 0;
        }
        const { total, remaining } = this.clickState;
        const envelope = remaining / total;
        const sample = Math.sin(this.clickState.phase) * this.clickState.gain * envelope;
        this.clickState.phase += this.clickState.phaseInc;
        this.clickState.remaining -= 1;
        if (this.clickState.remaining <= 0) {
            this.clickState = null;
        }
        return sample;
    }

    handleTick() {
        const subdivision = Math.max(1, this.subdivision);
        const beats = Math.max(1, this.beatsPerMeasure);
        const subIndex = this.tickIndex % subdivision;
        const beatIndex = Math.floor(this.tickIndex / subdivision) % beats;
        const isMainBeat = subIndex === 0;

        let clickKind = 'sub';
        let isAccent = false;

        if (isMainBeat) {
            if (this.countInActive) {
                clickKind = 'accent';
                isAccent = true;
                if (this.countInRemaining > 0) {
                    this.countInRemaining -= 1;
                }
                if (this.countInRemaining <= 0) {
                    this.countInActive = false;
                }
            } else {
                isAccent = this.accentEnabled && beatIndex === 0;
                clickKind = isAccent ? 'accent' : 'main';
            }
        }

        this.triggerClick(clickKind);

        if (isMainBeat) {
            this.port.postMessage({
                type: 'tick',
                beatIndex,
                isAccent,
                countInRemaining: this.countInRemaining,
                countInActive: this.countInActive,
            });
        }

        this.tickIndex += 1;
    }

    process(inputs, outputs) {
        const output = outputs[0];
        if (!output || !output.length) return true;
        const frames = output[0].length;

        for (let i = 0; i < frames; i += 1) {
            let sampleValue = 0;
            if (this.running) {
                while (this.samplesUntilNextTick <= 0) {
                    this.handleTick();
                    this.samplesUntilNextTick += this.samplesPerTick;
                }
                this.samplesUntilNextTick -= 1;
            }
            sampleValue += this.renderClickSample();
            for (let channel = 0; channel < output.length; channel += 1) {
                output[channel][i] = sampleValue;
            }
        }

        return true;
    }
}

registerProcessor('metronome-processor', MetronomeProcessor);
