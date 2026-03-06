import {
    init as initSessionController,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    getSessionState,
} from './session-controller.js';
import { RT_STATE, RT_FALLBACK, RT_SESSION_STARTED, RT_SESSION_STOPPED, VIEW_RENDERED } from '../utils/event-names.js';
import { createSessionUiControls } from './session-ui-controls.js';
import { hasE2ERealtimeHooks } from './session-test-flags.js';

let bound = false;
const controls = createSessionUiControls({
    getSessionState,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
});
const writeSessionStatus = (text, state) => {
    controls.writeStatus(text, state);
    controls.scheduleControlRefresh(true);
};
const refreshBindings = () => {
    controls.ensureTopbarIndicator();
    controls.invalidateControls();
    controls.bindButtons();
    controls.scheduleControlRefresh(true);
};

const exposeE2EHooks = () => {
    if (typeof window === 'undefined') return;
    if (!hasE2ERealtimeHooks(window)) return;
    window.__PANDA_RT_TEST_HOOKS__ = {
        startSession,
        stopSession,
        pauseSession,
        resumeSession,
        getSessionState,
    };
};

const bindGlobal = () => {
    if (bound) return;
    bound = true;

    document.addEventListener(RT_STATE, () => {
        controls.scheduleControlRefresh();
    });

    document.addEventListener(RT_SESSION_STARTED, () => {
        writeSessionStatus('Listening now', 'listening');
    });

    document.addEventListener(RT_SESSION_STOPPED, () => {
        writeSessionStatus('Mic off', 'idle');
    });

    document.addEventListener(RT_FALLBACK, (event) => {
        const reason = event.detail?.reason || 'Need grown-up help to continue.';
        controls.writeStatus(reason, 'fallback');
    });

    document.addEventListener(VIEW_RENDERED, refreshBindings);
    window.addEventListener('hashchange', refreshBindings, { passive: true });
};

/**
 * Initializes the realtime session UI bindings and optional E2E test hooks.
 */
export const init = () => {
    initSessionController();
    exposeE2EHooks();
    refreshBindings();
    bindGlobal();
};
