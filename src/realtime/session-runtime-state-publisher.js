import { RT_STATE } from '../utils/event-names.js';
import { cloneFeature } from './session-feature-utils.js';
import { getPolicyState } from './policy-engine.js';

const STATE_EMIT_THROTTLE_MS = 120;
const DEFAULT_RT_FEATURE = Object.freeze({
    frequency: 0,
    note: '--',
    cents: 0,
    tempoBpm: 0,
    confidence: 0,
});

export const createSessionStatePublisher = ({
    state,
    currentViewId,
    emitRealtimeEvent,
}) => {
    let lastStateEmitAt = 0;

    const publishState = (force = false) => {
        const now = Date.now();
        if (!force && now - lastStateEmitAt < STATE_EMIT_THROTTLE_MS) return;
        lastStateEmitAt = now;
        const payload = {
            sessionId: state.sessionId || 'none',
            listening: state.listening,
            paused: state.paused,
            confidenceBand: state.confidenceBand,
            cueState: state.cueState,
            viewId: currentViewId(),
            lastFeature: state.lastFeature || DEFAULT_RT_FEATURE,
            timestamp: now,
        };
        emitRealtimeEvent(RT_STATE, payload, { log: false }).catch(() => {});
    };

    const syncPolicyCache = () => {
        if (!state.policyCache) {
            state.policyCache = getPolicyState();
        }
        return state.policyCache;
    };

    const getSessionState = () => ({
        sessionId: state.sessionId,
        active: state.active,
        paused: state.paused,
        listening: state.listening,
        startedAt: state.startedAt,
        stoppedAt: state.stoppedAt,
        sourceView: state.sourceView,
        cueState: state.cueState,
        confidenceBand: state.confidenceBand,
        fallbackMode: state.fallbackMode,
        lastFeature: cloneFeature(state.lastFeature),
        lastCue: state.lastCue ? { ...state.lastCue } : null,
        calibration: { ...state.calibration },
        policy: syncPolicyCache(),
    });

    return {
        publishState,
        syncPolicyCache,
        getSessionState,
    };
};
