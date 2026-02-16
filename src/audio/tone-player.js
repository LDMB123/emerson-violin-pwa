import { isSoundEnabled } from '../utils/sound-state.js';

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
    D5: 587.33,
    E5: 659.25,
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

export const normalizeNote = (note) => {
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
    let playbackEnabled = isSoundEnabled();
    const active = new Set();

    const ensureContext = async () => {
        if (!context) {
            context = new AudioCtx();
        }
        if (context.state === 'suspended') {
            await context.resume();
        }
        return context;
    };

    const scheduleTone = async (frequency, { duration = 0.45, volume = 0.18, type = 'sine' } = {}) => {
        if (!playbackEnabled) {
            return false;
        }
        const ctx = await ensureContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const now = ctx.currentTime;
        const safeDuration = Math.max(0.1, duration);
        const safeVolume = Math.max(0.02, Math.min(volume, 0.4));

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(safeVolume, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + safeDuration);
        oscillator.connect(gainNode).connect(ctx.destination);
        active.add(oscillator);
        oscillator.start(now);
        oscillator.stop(now + safeDuration + 0.02);
        oscillator.onended = () => {
            active.delete(oscillator);
            oscillator.disconnect();
            gainNode.disconnect();
        };
        await wait((safeDuration + 0.04) * 1000);
        return true;
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
        }
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseContext();
    });

    document.addEventListener('panda:sounds-change', syncSoundState);

    syncSoundState();

    return {
        playNote,
        playSequence,
        stopAll,
    };
};
