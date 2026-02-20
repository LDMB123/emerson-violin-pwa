import { createAudioContext } from '../audio-context.js';
import { setParam } from './shared.js';

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

export const ensurePlayerContext = async (state) => {
    if (!state.context) {
        state.context = createAudioContext();
        if (!state.context) return null;
        state.outputNode = null;
    }
    if (state.context.state === 'suspended') {
        try {
            await state.context.resume();
        } catch {
            return null;
        }
    }
    return state.context;
};

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

export const unlockTonePlayerContext = (state) => {
    if (!state.context || state.context.state !== 'suspended') return;
    state.context.resume().catch(() => {});
};

export const bindTonePlayerUnlockGestures = (state, unlockContext) => {
    if (state.unlockBound) return;
    state.unlockBound = true;
    document.addEventListener('pointerdown', unlockContext, { passive: true });
    document.addEventListener('touchstart', unlockContext, { passive: true });
    document.addEventListener('keydown', unlockContext, { passive: true });
};

export const releaseTonePlayerContext = (state, stopAll) => {
    stopAll();
    if (state.context) {
        state.context.close().catch(() => {});
        state.context = null;
        state.outputNode = null;
    }
};
