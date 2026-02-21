import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';
import { wait } from './tone-player/shared.js';
import {
    createTonePlayerState,
    ensurePlayerContext,
    ensurePlayerOutputNode,
    unlockTonePlayerContext,
    bindTonePlayerUnlockGestures,
    releaseTonePlayerContext,
} from './tone-player/context-manager.js';
import {
    createSynthVoice,
    createSampleVoice,
    DEFAULT_TIMBRE,
    isSamplerType,
} from './tone-player/voice-factories.js';

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

const supportsSampler = () => typeof fetch === 'function' && typeof window !== 'undefined';

export const normalizeNote = (note) => {
    if (!note) return null;
    if (NOTE_FREQUENCIES[note]) return note;
    const trimmed = String(note).trim().toUpperCase();
    if (NOTE_FREQUENCIES[trimmed]) return trimmed;
    const mapped = DEFAULT_MAP[trimmed];
    return mapped || null;
};

export const createTonePlayer = () => {
    const state = createTonePlayerState({
        playbackEnabled: isSoundEnabled(),
        samplerBlocked: !supportsSampler(),
    });

    const playVoice = async (voice) => {
        if (!voice) return false;
        state.active.add(voice);
        await wait(voice.waitMs);
        state.active.delete(voice);
        voice.cleanup();
        return true;
    };

    const scheduleTone = async (frequency, { duration = 0.45, volume = 0.22, type = DEFAULT_TIMBRE, startTime } = {}) => {
        if (!state.playbackEnabled) {
            return false;
        }
        const ctx = await ensurePlayerContext(state);
        if (!ctx) return false;

        if (isSamplerType(type) && !state.samplerBlocked) {
            const sampleVoice = await createSampleVoice({
                state,
                ctx,
                frequency,
                options: { duration, volume, type, startTime },
                ensureOutputNode: ensurePlayerOutputNode,
            });
            if (sampleVoice) {
                return playVoice(sampleVoice);
            }
        }

        const synthVoice = createSynthVoice({
            state,
            ctx,
            frequency,
            options: { duration, volume, type, startTime },
            ensureOutputNode: ensurePlayerOutputNode,
        });
        return playVoice(synthVoice);
    };

    const playNote = async (note, options = {}) => {
        const normalized = normalizeNote(note);
        if (!normalized) return false;
        if (!state.playbackEnabled) {
            return false;
        }
        const frequency = NOTE_FREQUENCIES[normalized];
        if (!frequency) return false;
        return scheduleTone(frequency, options);
    };

    const stopAll = () => {
        state.sequenceToken += 1;
        state.active.forEach((voice) => {
            voice.stop();
        });
        state.active.clear();
    };

    const playSequence = async (notes = [], options = {}) => {
        const {
            tempo = 92,
            gap = 0.08,
            duration = 0.45,
            volume = 0.18,
            type = 'violin',
            delay = 0,
        } = options;
        if (!Array.isArray(notes) || !notes.length) return false;

        const ctx = await ensurePlayerContext(state);
        if (!ctx) return false;

        const token = ++state.sequenceToken;
        const beatMs = 60000 / Math.max(tempo, 1);
        const beatSecs = beatMs / 1000;

        let currentStartTime = ctx.currentTime + Math.max(0, delay) + 0.05;
        const playPromises = [];

        for (const note of notes) {
            if (!state.playbackEnabled || token !== state.sequenceToken) {
                return false;
            }
            // Schedule the note
            const promise = playNote(note, { duration, volume, type, startTime: currentStartTime });
            playPromises.push(promise);

            // Increment the time cursor exactly without JS drift
            currentStartTime += (duration + 0.08) + (beatSecs * gap);
        }

        const results = await Promise.all(playPromises);
        return results.every(Boolean);
    };

    const syncSoundState = () => {
        state.playbackEnabled = isSoundEnabled();
        if (!state.playbackEnabled) {
            stopAll();
        }
    };

    const unlockContext = () => {
        unlockTonePlayerContext(state);
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            releaseTonePlayerContext(state, stopAll);
        }
    });

    document.addEventListener(SOUNDS_CHANGE, syncSoundState);

    bindTonePlayerUnlockGestures(state, unlockContext);
    syncSoundState();

    return {
        playNote,
        playSequence,
        scheduleTone,
        stopAll,
    };
};
