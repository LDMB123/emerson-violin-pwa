import { createAudioContext } from '../audio/audio-context.js';
import { getJSON, setJSON } from '../persistence/storage.js';
import {
    RT_PROFILE_KEY,
    RT_UI_PREFS_KEY,
} from '../persistence/storage-keys.js';
import {
    RT_SESSION_STARTED,
    RT_SESSION_STOPPED,
    RT_QUALITY,
} from '../utils/event-names.js';
import { assertRealtimePayload } from './contracts.js';
import { appendRealtimeEvent, saveRealtimeQuality } from './event-log.js';
import { createSessionAudioGraph } from './session-audio-graph.js';
import { createSessionLifecycle } from './session-lifecycle.js';
import { createPolicyWorkerClient } from './policy-worker-client.js';
import { createSessionMetricsProfile } from './session-metrics-profile.js';
import {
    createRealtimeSessionId,
    createRealtimeSessionState,
    isPracticeHash,
} from './session-runtime-state.js';
import { createSessionRuntimeEngine } from './session-runtime-engine.js';

const QUALITY_WINDOW = 300;
const PROFILE_PERSIST_INTERVAL_MS = 10_000;

const state = createRealtimeSessionState();

const currentHash = () => window.location.hash || '#view-home';
const currentViewId = () => currentHash().replace(/^#/, '');

const persistSessionUiPreference = async (sessionActive) => {
    await setJSON(RT_UI_PREFS_KEY, {
        sessionActive,
        updatedAt: Date.now(),
    });
};

const emitRealtimeEvent = async (eventName, payload, { log = true } = {}) => {
    try {
        assertRealtimePayload(eventName, payload);
    } catch (error) {
        console.warn('[RealtimeSession] blocked invalid realtime payload', eventName, error);
        return;
    }
    document.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
    if (log) {
        appendRealtimeEvent(eventName, payload).catch(() => {});
    }
};

const metricsProfile = createSessionMetricsProfile({
    state,
    getJSON,
    setJSON,
    profileKey: RT_PROFILE_KEY,
    qualityWindow: QUALITY_WINDOW,
    profilePersistIntervalMs: PROFILE_PERSIST_INTERVAL_MS,
});

const policyWorkerClient = createPolicyWorkerClient({
    createWorker: () => new Worker(new URL('./policy-worker.js', import.meta.url), { type: 'module' }),
    onPolicyUpdate: (policy) => {
        state.policyCache = policy;
    },
});

const runtimeEngine = createSessionRuntimeEngine({
    state,
    currentViewId,
    emitRealtimeEvent,
    policyWorkerClient,
    metricsProfile,
});

const audioGraph = createSessionAudioGraph({
    createAudioContext,
    onFeatureFrame: (frame) => {
        runtimeEngine.processFeatureFrame(frame);
    },
    onFallbackReason: (reason) => runtimeEngine.handleFallbackReason(reason),
});

const lifecycle = createSessionLifecycle({
    state,
    getSessionState: () => runtimeEngine.getSessionState(),
    createSessionId: createRealtimeSessionId,
    currentViewId,
    currentHash,
    isPracticeHash,
    syncPolicyCache: runtimeEngine.syncPolicyCache,
    policyWorkerClient,
    metricsProfile,
    audioGraph,
    emitRealtimeEvent,
    persistSessionUiPreference,
    publishState: runtimeEngine.publishState,
    saveRealtimeQuality,
    rtSessionStartedEvent: RT_SESSION_STARTED,
    rtSessionStoppedEvent: RT_SESSION_STOPPED,
    rtQualityEvent: RT_QUALITY,
});

export const startSession = (...args) => lifecycle.startSession(...args);
export const stopSession = (...args) => lifecycle.stopSession(...args);
export const pauseSession = (...args) => lifecycle.pauseSession(...args);
export const resumeSession = (...args) => lifecycle.resumeSession(...args);
export const setParentPreset = (...args) => runtimeEngine.setParentPreset(...args);
export const getSessionState = () => runtimeEngine.getSessionState();
export const init = () => lifecycle.init();

export default {
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    getSessionState,
    setParentPreset,
};
