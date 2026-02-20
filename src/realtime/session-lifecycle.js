import { isBfcachePagehide } from '../utils/lifecycle-utils.js';

export const createSessionLifecycle = ({
    state,
    getSessionState,
    createSessionId,
    currentViewId,
    currentHash,
    isPracticeHash,
    syncPolicyCache,
    policyWorkerClient,
    metricsProfile,
    audioGraph,
    emitRealtimeEvent,
    persistSessionUiPreference,
    publishState,
    saveRealtimeQuality,
    rtSessionStartedEvent,
    rtSessionStoppedEvent,
    rtQualityEvent,
}) => {
    let globalBindingsReady = false;

    const setLifecycleFlags = ({
        active = state.active,
        paused = state.paused,
        listening = state.listening,
        starting = state.starting,
    } = {}) => {
        state.active = active;
        state.paused = paused;
        state.listening = listening;
        state.starting = starting;
    };

    const clearLifecycleFlags = () => {
        setLifecycleFlags({
            active: false,
            paused: false,
            listening: false,
            starting: false,
        });
    };

    const resetSessionStartContext = () => {
        state.sessionId = createSessionId();
        state.startedAt = Date.now();
        state.sourceView = currentViewId();
        state.fallbackMode = null;
        state.cueState = 'listening';
        state.confidenceBand = 'low';
        state.lastFeature = null;
        state.lastCue = null;
    };

    const announceSessionStarted = async () => {
        setLifecycleFlags({
            active: true,
            paused: false,
            listening: true,
            starting: false,
        });

        await emitRealtimeEvent(rtSessionStartedEvent, {
            sessionId: state.sessionId,
            startedAt: state.startedAt,
            sourceView: state.sourceView,
        });
        publishState(true);
        await persistSessionUiPreference(true);
    };

    const prepareSessionStart = async () => {
        setLifecycleFlags({ starting: true });
        resetSessionStartContext();
        syncPolicyCache();
        policyWorkerClient.ensureWorker();
        await metricsProfile.hydrateCalibrationFromProfile();
        metricsProfile.resetQualityCounters();
    };

    const clearSessionResources = async () => {
        policyWorkerClient.teardown();
        await audioGraph.clear();
    };

    const handleSessionStartFailure = async (error) => {
        console.warn('[RealtimeSession] start failed', error);
        clearLifecycleFlags();
        await clearSessionResources();
    };

    const finalizeSessionStop = async ({ reason, hadSession, stoppedAt }) => {
        clearLifecycleFlags();
        state.stoppedAt = stoppedAt;
        state.cueState = 'listening';
        state.confidenceBand = 'low';

        if (hadSession) {
            await emitRealtimeEvent(rtSessionStoppedEvent, {
                sessionId: state.sessionId,
                stoppedAt,
                reason,
            });
            const qualityPayload = metricsProfile.buildQualityPayload();
            await emitRealtimeEvent(rtQualityEvent, qualityPayload);
            await saveRealtimeQuality(qualityPayload);
        }

        await persistSessionUiPreference(false);
        publishState(true);
    };

    const lifecycle = {
        startSession: async () => {
            if (state.active && !state.paused) {
                return getSessionState();
            }
            if (state.active && state.paused) {
                return lifecycle.resumeSession();
            }
            if (state.starting) {
                return getSessionState();
            }

            await prepareSessionStart();

            try {
                await audioGraph.initialize();
                await announceSessionStarted();
            } catch (error) {
                await handleSessionStartFailure(error);
            }

            return getSessionState();
        },

        stopSession: async (reason = 'manual-stop') => {
            const hadSession = Boolean(state.sessionId);
            const stoppedAt = Date.now();
            await metricsProfile.flushProfileCache({ force: true });
            await clearSessionResources();
            await finalizeSessionStop({ reason, hadSession, stoppedAt });
            return getSessionState();
        },

        pauseSession: async (_reason = 'manual-pause') => {
            if (!state.active || state.paused) return getSessionState();
            setLifecycleFlags({ paused: true, listening: false });
            await audioGraph.transition((currentState) => currentState === 'running', 'suspend');
            publishState(true);
            return getSessionState();
        },

        resumeSession: async () => {
            if (!state.active) {
                return lifecycle.startSession();
            }
            if (!state.paused) return getSessionState();
            setLifecycleFlags({ paused: false, listening: true });
            await audioGraph.transition((currentState) => currentState !== 'running', 'resume');
            publishState(true);
            return getSessionState();
        },

        bindGlobalGuards: () => {
            if (globalBindingsReady) return;
            globalBindingsReady = true;

            window.addEventListener('hashchange', () => {
                const hash = currentHash();
                if (hash === '#view-parent') {
                    lifecycle.pauseSession('parent-zone').catch(() => {});
                    return;
                }
                if (state.active && state.paused && isPracticeHash(hash)) {
                    lifecycle.resumeSession().catch(() => {});
                    return;
                }
                if (state.active && !isPracticeHash(hash)) {
                    lifecycle.stopSession('leaving-practice').catch(() => {});
                }
            }, { passive: true });

            document.addEventListener('visibilitychange', () => {
                if (document.hidden && state.active && !state.paused) {
                    lifecycle.pauseSession('hidden').catch(() => {});
                }
            });

            window.addEventListener('pagehide', (event) => {
                if (isBfcachePagehide(event)) return;
                if (state.active) {
                    lifecycle.stopSession('pagehide').catch(() => {});
                }
            });
        },

        init: () => {
            syncPolicyCache();
            lifecycle.bindGlobalGuards();
            publishState(true);
        },
    };

    return lifecycle;
};
