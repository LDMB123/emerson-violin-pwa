import { setJSON, getJSON } from '../persistence/storage.js';
import { RT_POLICY_KEY } from '../persistence/storage-keys.js';
import {
    isParentPreset,
} from './contracts.js';
import {
    HARD_RAILS,
    evaluatePolicyFrame,
    getBoundsForPreset,
} from './policy-engine-core.js';

const state = {
    preset: 'standard',
    lastCueAt: 0,
    lastCueState: 'listening',
    consecutiveCorrections: 0,
    lowConfidenceFrames: 0,
    cueCounter: 0,
    hydrated: false,
};

const hydratePolicy = async () => {
    if (state.hydrated) return;
    state.hydrated = true;
    try {
        const stored = await getJSON(RT_POLICY_KEY);
        if (stored && isParentPreset(stored.preset)) {
            state.preset = stored.preset;
        }
    } catch {
        // Keep defaults on read failures.
    }
};

void hydratePolicy();

export const evaluateFrame = (features = {}, context = {}) => evaluatePolicyFrame(state, features, context);

export const applyParentPreset = async (preset) => {
    if (!isParentPreset(preset)) return state.preset;
    const previous = state.preset;
    state.preset = preset;
    try {
        await setJSON(RT_POLICY_KEY, {
            preset,
            previousPreset: previous,
            updatedAt: Date.now(),
        });
    } catch {
        // Ignore persistence errors.
    }
    return state.preset;
};

export const getPolicyState = () => ({
    preset: state.preset,
    rails: { ...HARD_RAILS },
    bounds: getBoundsForPreset(state.preset),
    lastCueAt: state.lastCueAt,
    lastCueState: state.lastCueState,
    consecutiveCorrections: state.consecutiveCorrections,
    lowConfidenceFrames: state.lowConfidenceFrames,
});
