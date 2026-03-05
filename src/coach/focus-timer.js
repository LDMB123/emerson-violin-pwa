import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { PERSIST_APPLIED, ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import {
    createTargetedRefreshHandlers,
    createResolveThenApplyHandler,
} from '../utils/event-handlers.js';
import { bindHiddenAndPagehide } from '../utils/lifecycle-utils.js';
import { markCheckboxInputChecked } from '../utils/checkbox-utils.js';
import { triggerMiniConfetti } from '../games/shared.js';
import { formatCountdown } from '../games/session-timer.js';
import { shouldStopFocusTimer } from './focus-timer-utils.js';
import { createCountdownLifecycle } from '../utils/countdown-lifecycle.js';
import { toCountdownSeconds } from '../utils/countdown-utils.js';

let focusToggle = null;
let focusArea = null;
let statusEl = null;

let remainingSeconds = 0;
let activeMinutes = 10;
let isCompleting = false;
let recommendedMinutes = 10;
let globalListenersBound = false;

const resolveElements = () => {
    focusToggle = document.querySelector('#focus-timer');
    focusArea = document.querySelector('.practice-focus');
    statusEl = document.querySelector('.focus-status');
    return Boolean(focusToggle && focusArea);
};

const setFocusDuration = (minutes) => {
    activeMinutes = minutes;
    if (focusArea) {
        focusArea.style.setProperty('--focus-duration', `${minutes * 60}s`);
    }
};

const applyTuning = async () => {
    if (!focusArea) return;
    const tuning = await getGameTuning('coach-focus');
    recommendedMinutes = tuning.focusMinutes ?? recommendedMinutes;
    if (!focusArea.dataset.userSet) {
        setFocusDuration(recommendedMinutes);
        if (statusEl) statusEl.textContent = 'Ready!';
    }
};

const logFocusMinutes = (minutes) => {
    const input = document.getElementById(`goal-step-focus-${minutes}`);
    if (!markCheckboxInputChecked(input)) return;
    input.checked = false;
};

const updateCountdownStatus = () => {
    if (!statusEl) return;
    statusEl.textContent = remainingSeconds > 0
        ? `Time left ${formatCountdown(remainingSeconds * 1000)}`
        : 'Session complete!';
};

const countdown = createCountdownLifecycle({
    getRemainingSeconds: () => remainingSeconds,
    setRemainingSeconds: (nextRemaining) => {
        remainingSeconds = nextRemaining;
    },
    onPublish: () => {
        updateCountdownStatus();
    },
    onElapsed: () => {
        finishSession();
    },
});

const clearTimer = () => {
    countdown.stop();
};

const stopSession = (completed = false) => {
    clearTimer();
    if (statusEl) {
        statusEl.textContent = completed ? 'Session complete! Great work.' : 'Session paused.';
    }
};

const finishSession = () => {
    if (isCompleting) return;
    isCompleting = true;
    stopSession(true);
    logFocusMinutes(activeMinutes);
    if (recommendedMinutes) {
        const accuracy = Math.min(100, (activeMinutes / recommendedMinutes) * 100);
        updateGameResult('coach-focus', { accuracy, score: activeMinutes }).catch(() => { });
    }
    if (focusToggle) focusToggle.checked = false;

    // Feature: Auto-Advance & Celebrate
    const winsTab = document.querySelector('[data-coach-step-target="play"]');
    if (winsTab) {
        winsTab.click(); // Switch to the Wins tab
    }
    triggerMiniConfetti(); // Celebrate focus completion

    window.setTimeout(() => {
        isCompleting = false;
    }, 0);
};

const startSession = () => {
    clearTimer();
    remainingSeconds = toCountdownSeconds(activeMinutes * 60 * 1000);
    countdown.start({ resetPublished: true });
};

const handleToggle = () => {
    if (!focusToggle) return;
    if (isCompleting) return;
    if (focusToggle.checked) {
        startSession();
    } else {
        stopSession(false);
    }
};

const stopWhenInactive = ({ force = false } = {}) => {
    const viewId = window.location.hash || '#view-home';
    if (!shouldStopFocusTimer({
        isChecked: Boolean(focusToggle?.checked),
        isCompleting,
        viewId,
        force,
    })) return;
    focusToggle.checked = false;
    const userToggle = false;
    stopSession(userToggle);
};

const bindLocalListeners = () => {
    if (focusToggle && focusToggle.dataset.focusTimerBound !== 'true') {
        focusToggle.dataset.focusTimerBound = 'true';
        focusToggle.addEventListener('change', handleToggle);
    }
};

const refreshFocusTuning = createResolveThenApplyHandler(resolveElements, applyTuning);

const { handleUpdate: handleMlUpdate } = createTargetedRefreshHandlers('coach-focus', refreshFocusTuning);
const handleMlReset = () => {
    refreshFocusTuning();
    if (focusArea) delete focusArea.dataset.userSet;
};

const bindGlobalListeners = () => {
    if (globalListenersBound === true) {
        return;
    }
    globalListenersBound = true;

    window.addEventListener('hashchange', () => stopWhenInactive(), { passive: true });
    const forceStopWhenInactive = () => {
        stopWhenInactive({ force: true });
    };
    bindHiddenAndPagehide({
        onHidden: forceStopWhenInactive,
        onPagehide: forceStopWhenInactive,
    });

    document.addEventListener(PERSIST_APPLIED, () => {
        if (!resolveElements()) return;
        setFocusDuration(activeMinutes);
    });

    [
        [ML_RESET, handleMlReset],
        [ML_UPDATE, handleMlUpdate],
    ].forEach(([eventName, handler]) => {
        document.addEventListener(eventName, handler);
    });
};

const initFocusTimer = () => {
    if (!resolveElements()) return;
    bindLocalListeners();
    applyTuning();
    setFocusDuration(activeMinutes);
};

export const init = initFocusTimer;

bindGlobalListeners();
