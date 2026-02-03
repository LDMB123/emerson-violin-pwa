const NOTE_FREQUENCIES = {
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
    D5: 587.33,
    E5: 659.25,
};

const DEFAULT_MAP = {
    G: 'G3',
    D: 'D4',
    A: 'A4',
    E: 'E5',
    B: 'B4',
    C: 'C5',
    'F#': 'F#4',
    F: 'F4',
};

import { createAudioContext } from './context.js';
import initAudioWasm, { generate_tone_buffer } from '@core/wasm/panda_audio.js';
const toneCache = new Map();
let wasmReady = null;

const ensureWasm = async () => {
    if (!generate_tone_buffer) return false;
    if (!wasmReady) {
        wasmReady = initAudioWasm().catch(() => {
            wasmReady = null;
            return null;
        });
    }
    await wasmReady;
    return true;
};

const getToneBuffer = async (ctx, frequency, durationMs) => {
    if (!ctx || !Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(durationMs)) return null;
    const key = `${frequency.toFixed(2)}|${Math.round(durationMs)}|${ctx.sampleRate}`;
    if (toneCache.has(key)) return toneCache.get(key);
    const ready = await ensureWasm();
    if (!ready) return null;
    let samples = null;
    try {
        samples = generate_tone_buffer(frequency, ctx.sampleRate, Math.round(durationMs));
    } catch {
        samples = null;
    }
    if (!samples || !samples.length) return null;
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    toneCache.set(key, buffer);
    return buffer;
};

const normalizeNote = (note) => {
    if (!note) return null;
    if (NOTE_FREQUENCIES[note]) return note;
    const trimmed = String(note).trim().toUpperCase();
    if (NOTE_FREQUENCIES[trimmed]) return trimmed;
    const mapped = DEFAULT_MAP[trimmed];
    return mapped || null;
};

export const createTonePlayer = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
        return null;
    }
    let context = null;
    let sequenceToken = 0;
    const active = new Set();

    const ensureContext = async () => {
        if (!context) {
            context = createAudioContext() || new AudioCtx();
        }
        if (context.state === 'suspended') {
            await context.resume();
        }
        return context;
    };

    const createEndPromise = (node, gainNode) => new Promise((resolve) => {
        node.onended = () => {
            active.delete(node);
            try {
                node.disconnect();
            } catch {}
            try {
                gainNode.disconnect();
            } catch {}
            resolve();
        };
    });

    const scheduleToneAt = async (
        ctx,
        frequency,
        startTime,
        { duration = 0.45, volume = 0.18, type = 'sine' } = {},
        token = null,
    ) => {
        if (!ctx) return null;
        const isCancelled = () => Number.isFinite(token) && token !== sequenceToken;
        const now = ctx.currentTime;
        const safeDuration = Math.max(0.1, duration);
        const safeVolume = Math.max(0.02, Math.min(volume, 0.4));
        const scheduledStart = Math.max(Number.isFinite(startTime) ? startTime : now, now + 0.01);
        const gainNode = ctx.createGain();
        let node = null;

        if (type === 'sine') {
            const buffer = await getToneBuffer(ctx, frequency, safeDuration * 1000);
            if (isCancelled()) return null;
            if (buffer) {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                node = source;
            }
        }

        if (isCancelled()) return null;

        if (!node) {
            const oscillator = ctx.createOscillator();
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            node = oscillator;
        }

        gainNode.gain.setValueAtTime(0, scheduledStart);
        gainNode.gain.linearRampToValueAtTime(safeVolume, scheduledStart + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, scheduledStart + safeDuration);
        node.connect(gainNode).connect(ctx.destination);
        active.add(node);

        const endTime = scheduledStart + safeDuration + 0.02;
        const done = createEndPromise(node, gainNode);
        node.start(scheduledStart);
        node.stop(endTime);
        return { endTime, done, node };
    };

    const playNote = async (note, options = {}) => {
        const normalized = normalizeNote(note);
        if (!normalized) return false;
        const frequency = NOTE_FREQUENCIES[normalized];
        if (!frequency) return false;
        const ctx = await ensureContext();
        const token = sequenceToken;
        const scheduled = await scheduleToneAt(ctx, frequency, ctx.currentTime, options, token);
        if (scheduled?.done) {
            await scheduled.done;
        }
        return Boolean(scheduled);
    };

    const stopAll = () => {
        sequenceToken += 1;
        active.forEach((oscillator) => {
            try {
                oscillator.stop();
            } catch {}
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
        const ctx = await ensureContext();
        const beatMs = 60000 / Math.max(tempo, 1);
        const gapSeconds = Math.max(0, beatMs * gap) / 1000;
        let startTime = ctx.currentTime;
        let lastDone = null;

        for (const note of notes) {
            if (token !== sequenceToken) return false;
            const normalized = normalizeNote(note);
            if (!normalized) {
                startTime += gapSeconds;
                continue;
            }
            const frequency = NOTE_FREQUENCIES[normalized];
            if (!frequency) {
                startTime += gapSeconds;
                continue;
            }
            const scheduled = await scheduleToneAt(ctx, frequency, startTime, { duration, volume, type }, token);
            if (!scheduled) continue;
            if (token !== sequenceToken) {
                try {
                    scheduled.node?.stop();
                } catch {}
                return false;
            }
            lastDone = scheduled.done;
            startTime = scheduled.endTime + gapSeconds;
        }

        if (token !== sequenceToken) return false;
        if (lastDone) await lastDone;
        return true;
    };

    return {
        playNote,
        playSequence,
        stopAll,
    };
};
