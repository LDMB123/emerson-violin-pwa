import { createAudioContext } from '../audio/audio-context.js';
import { getJSON, setJSON } from '../persistence/storage.js';
import {
    RT_PROFILE_KEY,
    RT_UI_PREFS_KEY,
} from '../persistence/storage-keys.js';
import { appendRealtimeEvent, flushRealtimeEvents, saveRealtimeQuality } from './event-log.js';
import {
    RT_SESSION_STARTED,
    RT_SESSION_STOPPED,
    RT_QUALITY,
    RT_FEATURE,
    emitEvent,
} from '../utils/event-names.js';
import { assertRealtimePayload } from './contracts.js';
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
    emitEvent(eventName, payload);
    if (!log) return;
    void appendRealtimeEvent(eventName, payload).catch(() => undefined);
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
        // Route non-pitch worklet messages (echo envelope, etc.) to RT_FEATURE
        // so game modules can receive them. These are NOT pitch detection frames.
        if (frame && frame.type === 'echo_envelope') {
            emitRealtimeEvent(RT_FEATURE, frame, { log: false }).catch(() => {});
            return;
        }
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
    flushRealtimeEvents,
    rtSessionStartedEvent: RT_SESSION_STARTED,
    rtSessionStoppedEvent: RT_SESSION_STOPPED,
    rtQualityEvent: RT_QUALITY,
});

/** Starts a realtime coaching session and boots the audio/runtime lifecycle. */
export const startSession = (...args) => lifecycle.startSession(...args);
/** Stops the active realtime coaching session and tears down runtime resources. */
export const stopSession = (...args) => lifecycle.stopSession(...args);
/** Pauses the active session without discarding accumulated session state. */
export const pauseSession = (...args) => lifecycle.pauseSession(...args);
/** Resumes a paused session after lifecycle and policy checks pass. */
export const resumeSession = (...args) => lifecycle.resumeSession(...args);
/** Applies the selected parent preset to the active realtime runtime engine. */
export const setParentPreset = (...args) => runtimeEngine.setParentPreset(...args);
/** Returns the latest public realtime session state snapshot. */
export const getSessionState = () => runtimeEngine.getSessionState();
/** Posts a control message directly to the realtime audio worklet graph. */
export const postAudioMessage = (msg) => audioGraph.postWorkletMessage(msg);
/** Initializes global realtime session listeners and persisted UI state. */
export const init = () => lifecycle.init();

export default {
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    getSessionState,
    setParentPreset,
    postAudioMessage,
};
