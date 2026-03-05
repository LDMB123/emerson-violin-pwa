import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { PERSIST_APPLIED, ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { bindHiddenAndPagehide } from '../utils/lifecycle-utils.js';
import { triggerMiniConfetti } from '../games/shared.js';
import { formatCountdown } from '../games/session-timer.js';
import { shouldStopFocusTimer } from './focus-timer-utils.js';

let focusToggle = null;
let focusArea = null;
let statusEl = null;

let intervalId = null;
let endTime = null;
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
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.checked = false;
};

const clearTimer = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    endTime = null;
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

const updateCountdown = () => {
    if (!endTime) return;
    const remaining = endTime - Date.now();
    if (statusEl) {
        statusEl.textContent = remaining > 0 ? `Time left ${formatCountdown(remaining)}` : 'Session complete!';
    }
    if (remaining <= 0) {
        finishSession();
    }
};

const startSession = () => {
    clearTimer();
    endTime = Date.now() + activeMinutes * 60 * 1000;
    if (statusEl) statusEl.textContent = `Time left ${formatCountdown(activeMinutes * 60 * 1000)}`;
    intervalId = window.setInterval(updateCountdown, 1000);
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
    stopSession(false);
};

const bindLocalListeners = () => {
    if (focusToggle && focusToggle.dataset.focusTimerBound !== 'true') {
        focusToggle.dataset.focusTimerBound = 'true';
        focusToggle.addEventListener('change', handleToggle);
    }
};

const refreshFocusTuning = () => {
    resolveElements();
    applyTuning();
};

const handleMlUpdate = (event) => {
    if (event.detail?.id !== 'coach-focus') return;
    refreshFocusTuning();
};

const handleMlReset = () => {
    resolveElements();
    if (focusArea) delete focusArea.dataset.userSet;
    applyTuning();
};

const bindGlobalListeners = () => {
    if (globalListenersBound === true) {
        return;
    }
    globalListenersBound = true;

    window.addEventListener('hashchange', () => stopWhenInactive(), { passive: true });
    bindHiddenAndPagehide({
        onHidden: () => {
            stopWhenInactive({ force: true });
        },
        onPagehide: () => {
            stopWhenInactive({ force: true });
        },
    });

    document.addEventListener(PERSIST_APPLIED, () => {
        if (!resolveElements()) return;
        setFocusDuration(activeMinutes);
    });

    document.addEventListener(ML_RESET, handleMlReset);
    document.addEventListener(ML_UPDATE, handleMlUpdate);
};

const initFocusTimer = () => {
    if (!resolveElements()) return;
    bindLocalListeners();
    applyTuning();
    setFocusDuration(activeMinutes);
};

export const init = initFocusTimer;

bindGlobalListeners();
