import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';
import { createAudioContext } from './audio-context.js';
import { getAudioPathCandidates } from './format-detection.js';

export const NOTE_FREQUENCIES = {
    G3: 196.00,
    A3: 220.00,
    B3: 246.94,
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    'F#4': 369.99,
    G4: 392.00,
    A4: 440.00,
    B4: 493.88,
    C5: 523.25,
    'C#5': 554.37,
    D5: 587.33,
    E5: 659.25,
    'F#5': 739.99,
    'G#5': 830.61,
};

export const DEFAULT_MAP = {
    G: 'G3',
    D: 'D4',
    A: 'A4',
    E: 'E5',
    B: 'B4',
    C: 'C5',
    'F#': 'F#4',
    F: 'F4',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const DEFAULT_TIMBRE = 'violin';
const DEFAULT_ATTACK = 0.014;
const DEFAULT_RELEASE = 0.06;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const setParam = (param, value, time = 0, method = null) => {
    if (!param) return;
    if (method && typeof param[method] === 'function') {
        param[method](value, time);
        return;
    }
    if ('value' in param) {
        param.value = value;
    }
};

const SAMPLE_ROOTS = [
    { note: 'G3', frequency: NOTE_FREQUENCIES.G3, file: 'violin-g3' },
    { note: 'D4', frequency: NOTE_FREQUENCIES.D4, file: 'violin-d4' },
    { note: 'A4', frequency: NOTE_FREQUENCIES.A4, file: 'violin-a4' },
    { note: 'E5', frequency: NOTE_FREQUENCIES.E5, file: 'violin-e5' },
];

const isSamplerType = (type = DEFAULT_TIMBRE) => !['square', 'sawtooth'].includes(type);

const supportsSampler = () => typeof fetch === 'function' && typeof window !== 'undefined';

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

export const normalizeNote = (note) => {
    if (!note) return null;
    if (NOTE_FREQUENCIES[note]) return note;
    const trimmed = String(note).trim().toUpperCase();
    if (NOTE_FREQUENCIES[trimmed]) return trimmed;
    const mapped = DEFAULT_MAP[trimmed];
    return mapped || null;
};

export const createTonePlayer = () => {
    let context = null;
    let sequenceToken = 0;
    let playbackEnabled = isSoundEnabled();
    const active = new Set();
    let outputNode = null;
    let unlockBound = false;
    let samplerBlocked = !supportsSampler();
    const sampleBuffers = new Map();
    const sampleLoads = new Map();

    const ensureContext = async () => {
        if (!context) {
            context = createAudioContext();
            if (!context) return null;
            outputNode = null;
        }
        if (context.state === 'suspended') {
            try {
                await context.resume();
            } catch {
                return null;
            }
        }
        return context;
    };

    const loadSampleBuffer = async (ctx, root) => {
        if (samplerBlocked) return null;
        if (sampleBuffers.has(root.note)) {
            return sampleBuffers.get(root.note);
        }
        if (sampleLoads.has(root.note)) {
            return sampleLoads.get(root.note);
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
                        sampleBuffers.set(root.note, decoded);
                        samplerBlocked = false;
                        return decoded;
                    }
                } catch {
                    // Try the next candidate path.
                }
            }
            samplerBlocked = true;
            return null;
        })();

        sampleLoads.set(root.note, load);
        const result = await load;
        sampleLoads.delete(root.note);
        return result;
    };

    const ensureOutputNode = (ctx) => {
        if (outputNode) return outputNode;
        const masterGain = ctx.createGain();
        setParam(masterGain.gain, 0.95);
        let tail = masterGain;

        if (typeof ctx.createDynamicsCompressor === 'function') {
            const compressor = ctx.createDynamicsCompressor();
            setParam(compressor.threshold, -24);
            setParam(compressor.knee, 28);
            setParam(compressor.ratio, 7);
            setParam(compressor.attack, 0.004);
            setParam(compressor.release, 0.2);
            tail.connect(compressor);
            tail = compressor;
        }

        tail.connect(ctx.destination);
        outputNode = masterGain;
        return outputNode;
    };

    const createSynthVoice = (ctx, frequency, options = {}) => {
        const now = ctx.currentTime;
        const safeDuration = Math.max(0.1, options.duration ?? 0.45);
        const safeVolume = clamp(options.volume ?? 0.18, 0.04, 0.55);
        const timbreKey = TIMBRE_PARTIALS[options.type] ? options.type : DEFAULT_TIMBRE;
        const partials = TIMBRE_PARTIALS[timbreKey];
        const attack = Math.min(DEFAULT_ATTACK, safeDuration / 3);
        const releaseStart = now + Math.max(attack + 0.015, safeDuration - DEFAULT_RELEASE);
        const stopAt = now + safeDuration + 0.03;

        const voiceGain = ctx.createGain();
        setParam(voiceGain.gain, 0, now, 'setValueAtTime');
        setParam(voiceGain.gain, safeVolume, now + attack, 'linearRampToValueAtTime');
        setParam(voiceGain.gain, safeVolume * 0.65, releaseStart, 'linearRampToValueAtTime');
        setParam(voiceGain.gain, 0.0001, stopAt, 'exponentialRampToValueAtTime');

        let voiceTail = voiceGain;
        if (typeof ctx.createBiquadFilter === 'function') {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            setParam(filter.frequency, clamp(frequency * 6, 1400, 5200));
            setParam(filter.Q, 0.65);
            voiceTail.connect(filter);
            voiceTail = filter;
        }

        voiceTail.connect(ensureOutputNode(ctx));

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
            oscillators.forEach((oscillator) => {
                oscillator.disconnect();
            });
            if (vibratoOsc) vibratoOsc.disconnect();
            if (vibratoGain) vibratoGain.disconnect();
            voiceGain.disconnect();
        };

        const stop = () => {
            oscillators.forEach((oscillator) => {
                try {
                    oscillator.stop();
                } catch {}
            });
            if (vibratoOsc) {
                try {
                    vibratoOsc.stop();
                } catch {}
            }
            cleanup();
        };

        return {
            waitMs: (safeDuration + 0.08) * 1000,
            stop,
            cleanup,
        };
    };

    const createSampleVoice = async (ctx, frequency, options = {}) => {
        if (typeof ctx.createBufferSource !== 'function') return null;
        const root = pickSampleRoot(frequency);
        const buffer = await loadSampleBuffer(ctx, root);
        if (!buffer) return null;

        const now = ctx.currentTime;
        const safeDuration = Math.max(0.1, options.duration ?? 0.45);
        const safeVolume = clamp(options.volume ?? 0.22, 0.04, 0.6);
        const stopAt = now + safeDuration + 0.03;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = clamp(frequency / root.frequency, 0.52, 2.1);

        const voiceGain = ctx.createGain();
        setParam(voiceGain.gain, 0, now, 'setValueAtTime');
        setParam(voiceGain.gain, safeVolume, now + 0.015, 'linearRampToValueAtTime');
        setParam(voiceGain.gain, safeVolume * 0.68, now + Math.max(0.03, safeDuration - 0.08), 'linearRampToValueAtTime');
        setParam(voiceGain.gain, 0.0001, stopAt, 'exponentialRampToValueAtTime');

        let voiceTail = voiceGain;
        let filterNode = null;
        if (typeof ctx.createBiquadFilter === 'function') {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            setParam(filter.frequency, clamp(frequency * 5.5, 1500, 5400));
            setParam(filter.Q, 0.75);
            voiceTail.connect(filter);
            voiceTail = filter;
            filterNode = filter;
        }

        source.connect(voiceGain);
        voiceTail.connect(ensureOutputNode(ctx));
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
            source.disconnect();
            voiceGain.disconnect();
            if (filterNode) filterNode.disconnect();
        };
        source.onended = cleanup;

        return {
            waitMs: (safeDuration + 0.08) * 1000,
            stop: () => {
                try {
                    source.stop();
                } catch {}
                cleanup();
            },
            cleanup,
        };
    };

    const playVoice = async (voice) => {
        if (!voice) return false;
        active.add(voice);
        await wait(voice.waitMs);
        active.delete(voice);
        voice.cleanup();
        return true;
    };

    const scheduleTone = async (frequency, { duration = 0.45, volume = 0.22, type = DEFAULT_TIMBRE } = {}) => {
        if (!playbackEnabled) {
            return false;
        }
        const ctx = await ensureContext();
        if (!ctx) return false;

        if (isSamplerType(type) && !samplerBlocked) {
            const sampleVoice = await createSampleVoice(ctx, frequency, { duration, volume, type });
            if (sampleVoice) {
                return playVoice(sampleVoice);
            }
        }

        const synthVoice = createSynthVoice(ctx, frequency, { duration, volume, type });
        return playVoice(synthVoice);
    };

    const playNote = async (note, options = {}) => {
        const normalized = normalizeNote(note);
        if (!normalized) return false;
        if (!playbackEnabled) {
            return false;
        }
        const frequency = NOTE_FREQUENCIES[normalized];
        if (!frequency) return false;
        return scheduleTone(frequency, options);
    };

    const stopAll = () => {
        sequenceToken += 1;
        active.forEach((voice) => {
            voice.stop();
        });
        active.clear();
    };

    const playSequence = async (notes = [], options = {}) => {
        const {
            tempo = 92,
            gap = 0.08,
            duration = 0.45,
            volume = 0.18,
            type = 'sine',
        } = options;
        if (!Array.isArray(notes) || !notes.length) return false;
        const token = ++sequenceToken;
        const beatMs = 60000 / Math.max(tempo, 1);
        for (const note of notes) {
            if (!playbackEnabled) {
                stopAll();
                return false;
            }
            if (token !== sequenceToken) return false;
            await playNote(note, { duration, volume, type });
            await wait(Math.max(0, beatMs * gap));
        }
        return true;
    };

    const syncSoundState = () => {
        playbackEnabled = isSoundEnabled();
        if (!playbackEnabled) {
            stopAll();
        }
    };

    const releaseContext = () => {
        stopAll();
        if (context) {
            context.close().catch(() => {});
            context = null;
            outputNode = null;
        }
    };

    const unlockContext = () => {
        if (!context || context.state !== 'suspended') return;
        context.resume().catch(() => {});
    };

    const bindUnlockGestures = () => {
        if (unlockBound) return;
        unlockBound = true;
        document.addEventListener('pointerdown', unlockContext, { passive: true });
        document.addEventListener('touchstart', unlockContext, { passive: true });
        document.addEventListener('keydown', unlockContext, { passive: true });
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseContext();
    });

    document.addEventListener(SOUNDS_CHANGE, syncSoundState);

    bindUnlockGestures();
    syncSoundState();

    return {
        playNote,
        playSequence,
        scheduleTone,
        stopAll,
    };
};
