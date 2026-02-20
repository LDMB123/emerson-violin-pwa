import { getAudioPathCandidates } from '../format-detection.js';
import {
    clamp,
    setParam,
    safeStop,
    disconnectNodes,
} from './shared.js';

const TIMBRE_PARTIALS = {
    sine: [
        { type: 'sine', ratio: 1, mix: 1 },
    ],
    triangle: [
        { type: 'triangle', ratio: 1, mix: 0.82 },
        { type: 'sine', ratio: 2, mix: 0.25 },
    ],
    square: [
        { type: 'square', ratio: 1, mix: 0.76 },
        { type: 'sine', ratio: 2, mix: 0.28 },
        { type: 'triangle', ratio: 3, mix: 0.18 },
    ],
    sawtooth: [
        { type: 'sawtooth', ratio: 1, mix: 0.75 },
        { type: 'triangle', ratio: 2, mix: 0.25 },
        { type: 'sine', ratio: 3, mix: 0.12 },
    ],
    violin: [
        { type: 'sawtooth', ratio: 1, mix: 0.72 },
        { type: 'triangle', ratio: 2, mix: 0.28 },
        { type: 'sine', ratio: 3, mix: 0.2 },
        { type: 'sine', ratio: 4, mix: 0.1 },
    ],
};

export const DEFAULT_TIMBRE = 'violin';
const DEFAULT_ATTACK = 0.014;
const DEFAULT_RELEASE = 0.06;

const SAMPLE_ROOTS = [
    { note: 'G3', frequency: 196.00, file: 'violin-g3' },
    { note: 'D4', frequency: 293.66, file: 'violin-d4' },
    { note: 'A4', frequency: 440.00, file: 'violin-a4' },
    { note: 'E5', frequency: 659.25, file: 'violin-e5' },
];

const createEnvelopeGain = (
    ctx,
    {
        now,
        duration,
        volume,
        attack = DEFAULT_ATTACK,
        release = DEFAULT_RELEASE,
        decayFactor = 0.65,
        releaseFloor = 0.0001,
        releasePadding = 0.03,
        minSustain = 0.015,
    },
) => {
    const safeDuration = Math.max(0.1, duration ?? 0.45);
    const safeVolume = volume;
    const safeAttack = Math.min(attack, safeDuration / 3);
    const releaseStart = now + Math.max(safeAttack + minSustain, safeDuration - release);
    const stopAt = now + safeDuration + releasePadding;
    const gain = ctx.createGain();
    setParam(gain.gain, 0, now, 'setValueAtTime');
    setParam(gain.gain, safeVolume, now + safeAttack, 'linearRampToValueAtTime');
    setParam(gain.gain, safeVolume * decayFactor, releaseStart, 'linearRampToValueAtTime');
    setParam(gain.gain, releaseFloor, stopAt, 'exponentialRampToValueAtTime');
    return { gain, safeDuration, stopAt };
};

const connectOptionalLowpass = (
    ctx,
    sourceNode,
    frequency,
    {
        ratio = 6,
        min = 1400,
        max = 5200,
        q = 0.65,
    } = {},
) => {
    if (typeof ctx.createBiquadFilter !== 'function') {
        return { tail: sourceNode, filter: null };
    }
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    setParam(filter.frequency, clamp(frequency * ratio, min, max));
    setParam(filter.Q, q);
    sourceNode.connect(filter);
    return { tail: filter, filter };
};

const decodeAudioBuffer = async (ctx, arrayBuffer) => {
    if (typeof ctx.decodeAudioData !== 'function') return null;

    const copy = arrayBuffer.slice(0);
    if (ctx.decodeAudioData.length >= 2) {
        return new Promise((resolve, reject) => {
            ctx.decodeAudioData(copy, resolve, reject);
        }).catch(() => null);
    }

    try {
        return await ctx.decodeAudioData(copy);
    } catch {
        return null;
    }
};

const pickSampleRoot = (targetFrequency) => {
    let best = SAMPLE_ROOTS[0];
    let bestDistance = Infinity;

    SAMPLE_ROOTS.forEach((root) => {
        const distance = Math.abs(Math.log2(targetFrequency / root.frequency));
        if (distance < bestDistance) {
            best = root;
            bestDistance = distance;
        }
    });

    return best;
};

const loadSampleBufferForRoot = async (state, ctx, root) => {
    if (state.samplerBlocked) return null;
    if (state.sampleBuffers.has(root.note)) {
        return state.sampleBuffers.get(root.note);
    }
    if (state.sampleLoads.has(root.note)) {
        return state.sampleLoads.get(root.note);
    }

    const load = (async () => {
        const paths = getAudioPathCandidates(`./assets/audio/${root.file}.wav`);
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (!response.ok) continue;
                const arrayBuffer = await response.arrayBuffer();
                const decoded = await decodeAudioBuffer(ctx, arrayBuffer);
                if (decoded) {
                    state.sampleBuffers.set(root.note, decoded);
                    state.samplerBlocked = false;
                    return decoded;
                }
            } catch {
                // Try the next candidate path.
            }
        }
        state.samplerBlocked = true;
        return null;
    })();

    state.sampleLoads.set(root.note, load);
    const result = await load;
    state.sampleLoads.delete(root.note);
    return result;
};

export const isSamplerType = (type = DEFAULT_TIMBRE) => !['square', 'sawtooth'].includes(type);

export const createSynthVoice = ({ state, ctx, frequency, options = {}, ensureOutputNode }) => {
    const now = ctx.currentTime;
    const safeDuration = Math.max(0.1, options.duration ?? 0.45);
    const safeVolume = clamp(options.volume ?? 0.18, 0.04, 0.55);
    const timbreKey = TIMBRE_PARTIALS[options.type] ? options.type : DEFAULT_TIMBRE;
    const partials = TIMBRE_PARTIALS[timbreKey];
    const {
        gain: voiceGain,
        stopAt,
    } = createEnvelopeGain(ctx, {
        now,
        duration: safeDuration,
        volume: safeVolume,
        attack: DEFAULT_ATTACK,
        release: DEFAULT_RELEASE,
        decayFactor: 0.65,
        minSustain: 0.015,
    });
    const {
        tail: voiceTail,
        filter: filterNode,
    } = connectOptionalLowpass(ctx, voiceGain, frequency, {
        ratio: 6,
        min: 1400,
        max: 5200,
        q: 0.65,
    });

    voiceTail.connect(ensureOutputNode(state, ctx));

    const oscillators = partials.map((partial) => {
        const oscillator = ctx.createOscillator();
        const partialGain = ctx.createGain();
        oscillator.type = partial.type;
        setParam(oscillator.frequency, frequency * partial.ratio);
        setParam(partialGain.gain, partial.mix);
        oscillator.connect(partialGain).connect(voiceGain);
        oscillator.start(now);
        oscillator.stop(stopAt);
        return oscillator;
    });

    let vibratoOsc = null;
    let vibratoGain = null;
    if (timbreKey === 'violin' && typeof ctx.createOscillator === 'function') {
        vibratoOsc = ctx.createOscillator();
        vibratoGain = ctx.createGain();
        vibratoOsc.type = 'sine';
        setParam(vibratoOsc.frequency, 5.4);
        setParam(vibratoGain.gain, 2.2);
        vibratoOsc.connect(vibratoGain);
        oscillators.forEach((oscillator) => {
            if (oscillator.frequency) {
                vibratoGain.connect(oscillator.frequency);
            }
        });
        vibratoOsc.start(now);
        vibratoOsc.stop(stopAt);
    }

    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        disconnectNodes(oscillators);
        disconnectNodes([vibratoOsc, vibratoGain, voiceGain, filterNode]);
    };

    const stop = () => {
        oscillators.forEach(safeStop);
        safeStop(vibratoOsc);
        cleanup();
    };

    return {
        waitMs: (safeDuration + 0.08) * 1000,
        stop,
        cleanup,
    };
};

export const createSampleVoice = async ({ state, ctx, frequency, options = {}, ensureOutputNode }) => {
    if (typeof ctx.createBufferSource !== 'function') return null;
    const root = pickSampleRoot(frequency);
    const buffer = await loadSampleBufferForRoot(state, ctx, root);
    if (!buffer) return null;

    const now = ctx.currentTime;
    const safeDuration = Math.max(0.1, options.duration ?? 0.45);
    const safeVolume = clamp(options.volume ?? 0.22, 0.04, 0.6);
    const {
        gain: voiceGain,
        stopAt,
    } = createEnvelopeGain(ctx, {
        now,
        duration: safeDuration,
        volume: safeVolume,
        attack: 0.015,
        release: 0.08,
        decayFactor: 0.68,
        minSustain: 0.03,
    });

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = clamp(frequency / root.frequency, 0.52, 2.1);
    const {
        tail: voiceTail,
        filter: filterNode,
    } = connectOptionalLowpass(ctx, voiceGain, frequency, {
        ratio: 5.5,
        min: 1500,
        max: 5400,
        q: 0.75,
    });

    source.connect(voiceGain);
    voiceTail.connect(ensureOutputNode(state, ctx));
    try {
        source.start(now, 0);
        source.stop(stopAt);
    } catch {
        return null;
    }

    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        disconnectNodes([source, voiceGain, filterNode]);
    };
    source.onended = cleanup;

    return {
        waitMs: (safeDuration + 0.08) * 1000,
        stop: () => {
            safeStop(source);
            cleanup();
        },
        cleanup,
    };
};
