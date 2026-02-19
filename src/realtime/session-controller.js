import { createAudioContext } from '../audio/audio-context.js';
import { getJSON, setJSON } from '../persistence/storage.js';
import {
    RT_PROFILE_KEY,
    RT_UI_PREFS_KEY,
} from '../persistence/storage-keys.js';
import {
    RT_SESSION_STARTED,
    RT_SESSION_STOPPED,
    RT_CUE,
    RT_STATE,
    RT_FALLBACK,
    RT_PARENT_OVERRIDE,
    RT_QUALITY,
} from '../utils/event-names.js';
import {
    assertRealtimePayload,
    confidenceBandFrom,
} from './contracts.js';
import { appendRealtimeEvent, saveRealtimeQuality } from './event-log.js';
import { evaluateFrame, applyParentPreset, getPolicyState } from './policy-engine.js';

const QUALITY_WINDOW = 300;
const STATE_EMIT_THROTTLE_MS = 120;
const PRACTICE_VIEW_PREFIXES = [
    '#view-home',
    '#view-coach',
    '#view-games',
    '#view-songs',
    '#view-tuner',
    '#view-progress',
    '#view-analysis',
    '#view-game-',
    '#view-song-',
];

const state = {
    sessionId: '',
    active: false,
    paused: false,
    listening: false,
    starting: false,
    startedAt: 0,
    stoppedAt: 0,
    sourceView: 'view-coach',
    cueState: 'listening',
    confidenceBand: 'low',
    lastFeature: null,
    lastCue: null,
    fallbackMode: null,
    quality: {
        latencies: [],
        sampleCount: 0,
        cues: 0,
        corrections: 0,
        falseCorrections: 0,
        fallbackCount: 0,
    },
    policyCache: null,
    calibration: {
        pitchBiasCents: 0,
        rhythmBiasMs: 0,
        samples: 0,
    },
};

let audioContext = null;
let micStream = null;
let workletNode = null;
let sourceNode = null;
let silenceGain = null;
let globalBindingsReady = false;
let lastStateEmitAt = 0;
let lastCorrection = null;
let policyWorker = null;
let policyWorkerAvailable = true;
let policyRequestId = 0;
const pendingPolicyRequests = new Map();
let policyEvalInFlight = false;
let queuedPolicyEvalPayload = null;

const isPracticeHash = (hash) => PRACTICE_VIEW_PREFIXES.some((prefix) => hash.startsWith(prefix));
const currentHash = () => window.location.hash || '#view-home';
const currentViewId = () => currentHash().replace(/^#/, '');
const createSessionId = () => `rt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const clearPendingPolicyRequests = () => {
    pendingPolicyRequests.forEach((pending) => {
        if (typeof pending?.resolve === 'function') {
            pending.resolve(null);
        }
        if (pending?.timer) {
            clearTimeout(pending.timer);
        }
    });
    pendingPolicyRequests.clear();
};

const teardownPolicyWorker = () => {
    if (policyWorker) {
        try {
            policyWorker.terminate();
        } catch {
            // Ignore worker termination errors.
        }
        policyWorker = null;
    }
    clearPendingPolicyRequests();
    policyEvalInFlight = false;
    queuedPolicyEvalPayload = null;
};

const ensurePolicyWorker = () => {
    if (!policyWorkerAvailable) return false;
    if (policyWorker) return true;
    if (typeof Worker === 'undefined') {
        policyWorkerAvailable = false;
        return false;
    }

    try {
        policyWorker = new Worker(new URL('./policy-worker.js', import.meta.url), { type: 'module' });
        policyWorker.onmessage = (event) => {
            const message = event.data || {};
            const requestId = message.requestId;
            if (Number.isFinite(requestId) && pendingPolicyRequests.has(requestId)) {
                const pending = pendingPolicyRequests.get(requestId);
                pendingPolicyRequests.delete(requestId);
                if (pending?.timer) clearTimeout(pending.timer);
                pending?.resolve?.(message);
            }

            if (message.policy && typeof message.policy === 'object') {
                state.policyCache = message.policy;
            }
        };
        policyWorker.onerror = (error) => {
            console.warn('[RealtimeSession] policy worker failed', error);
            policyWorkerAvailable = false;
            teardownPolicyWorker();
        };
        return true;
    } catch (error) {
        console.warn('[RealtimeSession] failed to initialize policy worker', error);
        policyWorkerAvailable = false;
        teardownPolicyWorker();
        return false;
    }
};

const requestPolicyWorker = (type, payload, timeoutMs = 120) => {
    if (!ensurePolicyWorker()) return Promise.resolve(null);

    const requestId = (policyRequestId += 1);
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pendingPolicyRequests.delete(requestId);
            resolve(null);
        }, timeoutMs);
        pendingPolicyRequests.set(requestId, { resolve, timer });

        try {
            policyWorker.postMessage({ type, payload, requestId });
        } catch (error) {
            clearTimeout(timer);
            pendingPolicyRequests.delete(requestId);
            resolve(null);
            console.warn('[RealtimeSession] policy worker message failed', error);
        }
    });
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const cloneFeature = (feature) => {
    if (!feature || typeof feature !== 'object') return null;
    return {
        frequency: Number.isFinite(feature.frequency) ? feature.frequency : 0,
        note: feature.note || '--',
        cents: Number.isFinite(feature.cents) ? feature.cents : 0,
        tempoBpm: Number.isFinite(feature.tempoBpm) ? feature.tempoBpm : 0,
        confidence: Number.isFinite(feature.confidence) ? feature.confidence : 0,
        rhythmOffsetMs: Number.isFinite(feature.rhythmOffsetMs) ? feature.rhythmOffsetMs : 0,
        onset: Boolean(feature.onset),
        hasSignal: Boolean(feature.hasSignal),
        timestamp: Number.isFinite(feature.timestamp) ? feature.timestamp : Date.now(),
    };
};

const p95 = (values) => {
    if (!Array.isArray(values) || !values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return sorted[index];
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
        lastFeature: state.lastFeature || {
            frequency: 0,
            note: '--',
            cents: 0,
            tempoBpm: 0,
            confidence: 0,
        },
        timestamp: now,
    };
    emitRealtimeEvent(RT_STATE, payload).catch(() => {});
};

const updateQuality = (frame) => {
    const latency = Number.isFinite(frame?.timestamp) ? Date.now() - frame.timestamp : null;
    if (Number.isFinite(latency) && latency >= 0 && latency < 10_000) {
        state.quality.latencies.push(latency);
        if (state.quality.latencies.length > QUALITY_WINDOW) {
            state.quality.latencies.shift();
        }
    }
    state.quality.sampleCount += 1;
};

const buildQualityPayload = () => {
    const corrections = Math.max(1, state.quality.corrections);
    const cueCount = Math.max(1, state.quality.cues);
    return {
        sessionId: state.sessionId || 'none',
        p95CueLatencyMs: Math.round(p95(state.quality.latencies)),
        falseCorrectionRate: state.quality.falseCorrections / corrections,
        fallbackRate: state.quality.fallbackCount / cueCount,
        sampleCount: state.quality.sampleCount,
        at: Date.now(),
    };
};

const persistProfile = async (feature) => {
    const existing = await getJSON(RT_PROFILE_KEY);
    const profile = existing && typeof existing === 'object' ? existing : {};
    profile.lastSessionAt = Date.now();
    profile.lastPitchCents = Number.isFinite(feature?.cents) ? feature.cents : 0;
    profile.lastTempoBpm = Number.isFinite(feature?.tempoBpm) ? feature.tempoBpm : 0;
    profile.lastConfidence = Number.isFinite(feature?.confidence) ? feature.confidence : 0;
    profile.longTermPitchBiasCents = state.calibration.pitchBiasCents;
    profile.longTermRhythmBiasMs = state.calibration.rhythmBiasMs;
    profile.longTermSampleCount = state.calibration.samples;
    await setJSON(RT_PROFILE_KEY, profile);
};

const hydrateCalibrationFromProfile = async () => {
    try {
        const profile = await getJSON(RT_PROFILE_KEY);
        if (!profile || typeof profile !== 'object') return;

        const savedPitchBias = Number.isFinite(profile.longTermPitchBiasCents)
            ? profile.longTermPitchBiasCents
            : 0;
        const savedRhythmBias = Number.isFinite(profile.longTermRhythmBiasMs)
            ? profile.longTermRhythmBiasMs
            : 0;
        const savedSamples = Number.isFinite(profile.longTermSampleCount)
            ? profile.longTermSampleCount
            : 0;

        // Slower long-term personalization seed, constrained by safety bounds.
        state.calibration.pitchBiasCents = clamp(savedPitchBias, -18, 18);
        state.calibration.rhythmBiasMs = clamp(savedRhythmBias, -120, 120);
        state.calibration.samples = Math.max(0, Math.round(savedSamples));
    } catch {
        // Keep default calibration on read failures.
    }
};

const updateSessionCalibration = (feature) => {
    if (!feature?.hasSignal) return;
    const confidence = Number.isFinite(feature.confidence) ? feature.confidence : 0;
    if (confidence < 0.6) return;

    // Fast in-session adaptation using clipped incremental averages.
    const pitchTarget = clamp(feature.cents, -30, 30);
    const rhythmTarget = clamp(feature.rhythmOffsetMs, -180, 180);

    const alphaFast = 0.14;
    state.calibration.pitchBiasCents = clamp(
        state.calibration.pitchBiasCents + (pitchTarget - state.calibration.pitchBiasCents) * alphaFast,
        -24,
        24,
    );
    state.calibration.rhythmBiasMs = clamp(
        state.calibration.rhythmBiasMs + (rhythmTarget - state.calibration.rhythmBiasMs) * alphaFast,
        -150,
        150,
    );
    state.calibration.samples += 1;
};

const resetQualityCounters = () => {
    state.quality.latencies = [];
    state.quality.sampleCount = 0;
    state.quality.cues = 0;
    state.quality.corrections = 0;
    state.quality.falseCorrections = 0;
    state.quality.fallbackCount = 0;
};

const syncPolicyCache = () => {
    if (!state.policyCache) {
        state.policyCache = getPolicyState();
    }
    return state.policyCache;
};

const processCueDecision = (cueDecision) => {
    if (!cueDecision) return;
    state.lastCue = cueDecision;
    state.cueState = cueDecision.state || 'listening';
    state.confidenceBand = cueDecision.confidenceBand || state.confidenceBand;
    state.quality.cues += 1;

    const isCorrection = cueDecision.state === 'adjust-up' || cueDecision.state === 'adjust-down';
    if (isCorrection) {
        state.quality.corrections += 1;
        if (
            lastCorrection
            && lastCorrection.state !== cueDecision.state
            && cueDecision.issuedAt - lastCorrection.issuedAt <= 2200
            && cueDecision.confidenceBand === 'high'
            && lastCorrection.confidenceBand === 'high'
        ) {
            state.quality.falseCorrections += 1;
        }
        lastCorrection = cueDecision;
    }

    emitRealtimeEvent(RT_CUE, cueDecision).catch(() => {});

    if (cueDecision.fallback) {
        state.fallbackMode = 'manual-drill';
        state.quality.fallbackCount += 1;
        emitRealtimeEvent(RT_FALLBACK, {
            sessionId: state.sessionId || 'none',
            reason: cueDecision.message,
            mode: 'manual-drill',
            at: Date.now(),
        }).catch(() => {});
    }
};

const processPolicyEvalPayload = (payload) => {
    if (ensurePolicyWorker()) {
        if (policyEvalInFlight) {
            queuedPolicyEvalPayload = payload;
            return;
        }

        policyEvalInFlight = true;
        requestPolicyWorker('evaluate', payload).then((message) => {
            if (!state.active || state.paused) return;
            const cueDecision = message?.cueDecision || null;
            processCueDecision(cueDecision);
            publishState();
        }).finally(() => {
            policyEvalInFlight = false;
            if (queuedPolicyEvalPayload) {
                const nextPayload = queuedPolicyEvalPayload;
                queuedPolicyEvalPayload = null;
                processPolicyEvalPayload(nextPayload);
            }
        });
        return;
    }

    const cueDecision = evaluateFrame(payload.features, payload.context);
    processCueDecision(cueDecision);
    publishState();
};

const processFeatureFrame = (frame) => {
    if (!state.active || state.paused) return;

    const feature = cloneFeature(frame);
    state.lastFeature = feature;
    state.confidenceBand = confidenceBandFrom(feature?.confidence || 0);

    updateQuality(feature);
    updateSessionCalibration(feature);
    persistProfile(feature).catch(() => {});

    const calibratedPitch = feature.cents - state.calibration.pitchBiasCents;
    const calibratedRhythm = feature.rhythmOffsetMs - state.calibration.rhythmBiasMs;

    const evaluatePayload = {
        features: {
            pitchCents: calibratedPitch,
            rhythmOffsetMs: calibratedRhythm,
            confidence: feature.confidence,
            hasSignal: feature.hasSignal,
            onset: feature.onset,
        },
        context: {
            now: Date.now(),
            viewId: currentViewId(),
        },
    };

    processPolicyEvalPayload(evaluatePayload);
};

const clearAudioGraph = async () => {
    teardownPolicyWorker();
    if (workletNode) {
        workletNode.port.onmessage = null;
        try {
            workletNode.disconnect();
        } catch {
            // Ignore disconnect errors.
        }
        workletNode = null;
    }
    if (sourceNode) {
        try {
            sourceNode.disconnect();
        } catch {
            // Ignore disconnect errors.
        }
        sourceNode = null;
    }
    if (silenceGain) {
        try {
            silenceGain.disconnect();
        } catch {
            // Ignore disconnect errors.
        }
        silenceGain = null;
    }
    if (audioContext) {
        try {
            await audioContext.close();
        } catch {
            // Ignore close errors.
        }
        audioContext = null;
    }
    if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
    }
};

const fallbackWithoutMic = async (reason) => {
    state.fallbackMode = reason;
    await emitRealtimeEvent(RT_FALLBACK, {
        sessionId: state.sessionId || 'none',
        reason,
        mode: reason === 'mic-permission' ? 'mic-permission' : 'system',
        at: Date.now(),
    });
};

export const startSession = async () => {
    if (state.active && !state.paused) {
        return getSessionState();
    }
    if (state.active && state.paused) {
        return resumeSession();
    }
    if (state.starting) {
        return getSessionState();
    }

    state.starting = true;
    state.sessionId = createSessionId();
    state.startedAt = Date.now();
    state.sourceView = currentViewId();
    state.fallbackMode = null;
    state.cueState = 'listening';
    state.confidenceBand = 'low';
    state.lastFeature = null;
    state.lastCue = null;
    syncPolicyCache();
    ensurePolicyWorker();
    await hydrateCalibrationFromProfile();
    resetQualityCounters();

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            await fallbackWithoutMic('mic-permission');
            throw new Error('Microphone not supported');
        }

        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
            },
        });

        audioContext = createAudioContext({ latencyHint: 'interactive' });
        if (!audioContext || !audioContext.audioWorklet) {
            await fallbackWithoutMic('system');
            throw new Error('AudioWorklet unavailable');
        }

        await audioContext.audioWorklet.addModule(new URL('../worklets/rt-audio-processor.js', import.meta.url));

        sourceNode = audioContext.createMediaStreamSource(micStream);
        workletNode = new AudioWorkletNode(audioContext, 'rt-audio-processor');
        silenceGain = audioContext.createGain();
        silenceGain.gain.value = 0;

        sourceNode.connect(workletNode).connect(silenceGain).connect(audioContext.destination);
        workletNode.port.onmessage = (event) => {
            const data = event.data || {};
            if (data.ready) return;
            if (data.error) {
                fallbackWithoutMic('system').catch(() => {});
                return;
            }
            processFeatureFrame(data);
        };

        await audioContext.resume();

        state.active = true;
        state.paused = false;
        state.listening = true;
        state.starting = false;

        await emitRealtimeEvent(RT_SESSION_STARTED, {
            sessionId: state.sessionId,
            startedAt: state.startedAt,
            sourceView: state.sourceView,
        });
        publishState(true);
        await setJSON(RT_UI_PREFS_KEY, {
            sessionActive: true,
            updatedAt: Date.now(),
        });
    } catch (error) {
        console.warn('[RealtimeSession] start failed', error);
        state.starting = false;
        state.active = false;
        state.paused = false;
        state.listening = false;
        await clearAudioGraph();
    }

    return getSessionState();
};

export const stopSession = async (reason = 'manual-stop') => {
    const hadSession = Boolean(state.sessionId);
    const stoppedAt = Date.now();
    await clearAudioGraph();

    state.active = false;
    state.paused = false;
    state.listening = false;
    state.starting = false;
    state.stoppedAt = stoppedAt;
    state.cueState = 'listening';
    state.confidenceBand = 'low';

    if (hadSession) {
        await emitRealtimeEvent(RT_SESSION_STOPPED, {
            sessionId: state.sessionId,
            stoppedAt,
            reason,
        });
        const qualityPayload = buildQualityPayload();
        await emitRealtimeEvent(RT_QUALITY, qualityPayload);
        await saveRealtimeQuality(qualityPayload);
    }

    await setJSON(RT_UI_PREFS_KEY, {
        sessionActive: false,
        updatedAt: Date.now(),
    });

    publishState(true);
    return getSessionState();
};

export const pauseSession = async (_reason = 'manual-pause') => {
    if (!state.active || state.paused) return getSessionState();
    state.paused = true;
    state.listening = false;
    if (audioContext && audioContext.state === 'running') {
        try {
            await audioContext.suspend();
        } catch {
            // Ignore suspend errors.
        }
    }
    publishState(true);
    return getSessionState();
};

export const resumeSession = async () => {
    if (!state.active) {
        return startSession();
    }
    if (!state.paused) return getSessionState();
    state.paused = false;
    state.listening = true;
    if (audioContext && audioContext.state !== 'running') {
        try {
            await audioContext.resume();
        } catch {
            // Ignore resume errors.
        }
    }
    publishState(true);
    return getSessionState();
};

export const setParentPreset = async (preset, source = 'parent-zone') => {
    const previousPreset = (state.policyCache || getPolicyState()).preset;
    let nextPreset = previousPreset;

    if (ensurePolicyWorker()) {
        const message = await requestPolicyWorker('apply-preset', { preset }, 180);
        if (message?.preset) {
            nextPreset = message.preset;
        } else {
            nextPreset = await applyParentPreset(preset);
            state.policyCache = getPolicyState();
        }
    } else {
        nextPreset = await applyParentPreset(preset);
        state.policyCache = getPolicyState();
    }

    if (nextPreset !== previousPreset) {
        await emitRealtimeEvent(RT_PARENT_OVERRIDE, {
            preset: nextPreset,
            previousPreset,
            at: Date.now(),
            source,
        });
    }
    return nextPreset;
};

export const getSessionState = () => ({
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

const bindGlobalGuards = () => {
    if (globalBindingsReady) return;
    globalBindingsReady = true;

    window.addEventListener('hashchange', () => {
        const hash = currentHash();
        if (hash === '#view-parent') {
            pauseSession('parent-zone').catch(() => {});
            return;
        }
        if (state.active && state.paused && isPracticeHash(hash)) {
            resumeSession().catch(() => {});
            return;
        }
        if (state.active && !isPracticeHash(hash)) {
            stopSession('leaving-practice').catch(() => {});
        }
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state.active && !state.paused) {
            pauseSession('hidden').catch(() => {});
        }
    });

    window.addEventListener('pagehide', () => {
        if (state.active) {
            stopSession('pagehide').catch(() => {});
        }
    });
};

export const init = () => {
    syncPolicyCache();
    bindGlobalGuards();
    publishState(true);
};

export default {
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    getSessionState,
    setParentPreset,
};
