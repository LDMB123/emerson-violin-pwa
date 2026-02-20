import {
    init as initSessionController,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    getSessionState,
} from './session-controller.js';
import { RT_STATE, RT_FALLBACK, RT_SESSION_STARTED, RT_SESSION_STOPPED } from '../utils/event-names.js';
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
        controls.writeStatus('Listening now', 'listening');
        controls.scheduleControlRefresh(true);
    });

    document.addEventListener(RT_SESSION_STOPPED, () => {
        controls.writeStatus('Mic off', 'idle');
        controls.scheduleControlRefresh(true);
    });

    document.addEventListener(RT_FALLBACK, (event) => {
        const reason = event.detail?.reason || 'Need grown-up help to continue.';
        controls.writeStatus(reason, 'fallback');
    });

    const refreshBindings = () => {
        controls.ensureTopbarIndicator();
        controls.invalidateControls();
        controls.bindButtons();
        controls.scheduleControlRefresh(true);
    };

    document.addEventListener('panda:view-rendered', refreshBindings);
    window.addEventListener('hashchange', refreshBindings, { passive: true });
};

export const init = () => {
    initSessionController();
    exposeE2EHooks();
    controls.ensureTopbarIndicator();
    controls.invalidateControls();
    controls.bindButtons();
    bindGlobal();
    controls.scheduleControlRefresh(true);
};
