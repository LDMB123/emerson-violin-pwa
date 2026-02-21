import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { PERSIST_APPLIED, ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { isBfcachePagehide } from '../utils/lifecycle-utils.js';
import { setDifficultyBadge, triggerMiniConfetti } from '../games/shared.js';
import { shouldStopFocusTimer } from './focus-timer-utils.js';

let focusToggle = null;
let focusArea = null;
let durationEl = null;
let statusEl = null;
let durationRadios = [];

let intervalId = null;
let endTime = null;
let activeMinutes = 5;
let isCompleting = false;
let recommendedMinutes = 10;
let globalListenersBound = false;

const resolveElements = () => {
    focusToggle = document.querySelector('#focus-timer');
    focusArea = document.querySelector('.practice-focus');
    durationEl = document.querySelector('.focus-duration');
    statusEl = document.querySelector('.focus-status');
    durationRadios = Array.from(document.querySelectorAll('input[name="focus-duration"]'));
    return Boolean(focusToggle && focusArea);
};

const selectMinutes = (minutes) => {
    const target = durationRadios.find((radio) => radio.id === `focus-${minutes}`);
    if (target) {
        target.checked = true;
    }
};

const getSelectedMinutes = () => {
    const selected = durationRadios.find((radio) => radio.checked);
    if (!selected) return 5;
    if (selected.id === 'focus-10') return 10;
    if (selected.id === 'focus-15') return 15;
    return 5;
};

const formatTime = (ms) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const setFocusDuration = (minutes) => {
    activeMinutes = minutes;
    if (focusArea) {
        focusArea.style.setProperty('--focus-duration', `${minutes * 60}s`);
    }
    if (durationEl) {
        durationEl.textContent = `${minutes} min focus sprint`;
    }
};

const applyTuning = async () => {
    if (!focusArea) return;
    const tuning = await getGameTuning('coach-focus');
    recommendedMinutes = tuning.focusMinutes ?? recommendedMinutes;
    setDifficultyBadge(document.querySelector('.coach-card-header'), tuning.difficulty, 'Coach');
    if (!focusArea.dataset.userSet) {
        selectMinutes(recommendedMinutes);
        setFocusDuration(recommendedMinutes);
        if (statusEl) statusEl.textContent = `Suggested focus sprint: ${recommendedMinutes} minutes.`;
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
        statusEl.textContent = remaining > 0 ? `Time left ${formatTime(remaining)}` : 'Session complete!';
    }
    if (remaining <= 0) {
        finishSession();
    }
};

const startSession = () => {
    const minutes = getSelectedMinutes();
    setFocusDuration(minutes);
    clearTimer();
    endTime = Date.now() + minutes * 60 * 1000;
    if (statusEl) statusEl.textContent = `Time left ${formatTime(minutes * 60 * 1000)}`;
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
    durationRadios.forEach((radio) => {
        if (radio.dataset.focusTimerBound === 'true') return;
        radio.dataset.focusTimerBound = 'true';
        radio.addEventListener('change', () => {
            const minutes = getSelectedMinutes();
            if (focusArea) focusArea.dataset.userSet = 'true';
            setFocusDuration(minutes);
            if (focusToggle?.checked) {
                startSession();
            }
        });
    });

    if (focusToggle && focusToggle.dataset.focusTimerBound !== 'true') {
        focusToggle.dataset.focusTimerBound = 'true';
        focusToggle.addEventListener('change', handleToggle);
    }
};

const bindGlobalListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    window.addEventListener('hashchange', () => stopWhenInactive(), { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopWhenInactive({ force: true });
        }
    });
    window.addEventListener('pagehide', (event) => {
        if (isBfcachePagehide(event)) return;
        stopWhenInactive({ force: true });
    });

    document.addEventListener(PERSIST_APPLIED, () => {
        if (!resolveElements()) return;
        setFocusDuration(getSelectedMinutes());
    });

    document.addEventListener(ML_UPDATE, (event) => {
        if (event.detail?.id === 'coach-focus') {
            resolveElements();
            applyTuning();
        }
    });

    document.addEventListener(ML_RESET, () => {
        resolveElements();
        if (focusArea) delete focusArea.dataset.userSet;
        applyTuning();
    });
};

const initFocusTimer = () => {
    if (!resolveElements()) return;
    bindLocalListeners();
    applyTuning();
    setFocusDuration(getSelectedMinutes());
};

export const init = initFocusTimer;

bindGlobalListeners();
