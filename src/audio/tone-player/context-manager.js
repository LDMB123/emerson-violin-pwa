import { createAudioContext } from '../audio-context.js';
import { setParam } from './shared.js';

/** Creates the mutable runtime state container used by the shared tone player. */
export const createTonePlayerState = ({ playbackEnabled, samplerBlocked }) => ({
    context: null,
    sequenceToken: 0,
    playbackEnabled: Boolean(playbackEnabled),
    active: new Set(),
    outputNode: null,
    unlockBound: false,
    samplerBlocked: Boolean(samplerBlocked),
    sampleBuffers: new Map(),
    sampleLoads: new Map(),
});

const closeAndResetContext = (state) => {
    if (!state.context) return;
    state.context.close().catch(() => {});
    state.context = null;
    state.outputNode = null;
};

/** Ensures the tone player has a live `AudioContext`, recreating if needed. */
export const ensurePlayerContext = async (state) => {
    if (!state.context) {
        state.context = createAudioContext();
        if (!state.context) return null;
        state.outputNode = null;
    }
    if (state.context.state === 'suspended' || state.context.state === 'interrupted') {
        try {
            await state.context.resume();
        } catch {
            // Close the broken context so the next call creates a fresh one
            // rather than re-entering the resume path repeatedly.
            closeAndResetContext(state);
            return null;
        }
    }
    return state.context;
};

/** Lazily creates the shared master output chain for tone player playback. */
export const ensurePlayerOutputNode = (state, ctx) => {
    if (state.outputNode) return state.outputNode;
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
    state.outputNode = masterGain;
    return state.outputNode;
};

/** Attempts to resume a suspended tone-player context after a user gesture. */
export const unlockTonePlayerContext = (state) => {
    if (!state.context) return;
    if (state.context.state !== 'suspended' && state.context.state !== 'interrupted') return;
    state.context.resume().catch(() => {});
};

/** Binds one-time global gesture listeners that unlock blocked audio playback. */
export const bindTonePlayerUnlockGestures = (state, unlockContext) => {
    if (state.unlockBound) return;
    state.unlockBound = true;
    // Store the handler reference so we can remove it later
    state.unlockHandler = unlockContext;
    document.addEventListener('pointerdown', unlockContext, { passive: true });
    document.addEventListener('touchstart', unlockContext, { passive: true });
    document.addEventListener('keydown', unlockContext, { passive: true });
};

const unbindUnlockGestures = (state) => {
    if (!state.unlockBound || !state.unlockHandler) return;
    document.removeEventListener('pointerdown', state.unlockHandler);
    document.removeEventListener('touchstart', state.unlockHandler);
    document.removeEventListener('keydown', state.unlockHandler);
    state.unlockBound = false;
    state.unlockHandler = null;
};

/** Stops active playback, removes unlock listeners, and closes the context. */
export const releaseTonePlayerContext = (state, stopAll) => {
    stopAll();
    unbindUnlockGestures(state);
    closeAndResetContext(state);
};
