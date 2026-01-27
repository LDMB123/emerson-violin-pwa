const focusToggle = document.querySelector('#focus-timer');
const focusArea = document.querySelector('.practice-focus');
const durationEl = document.querySelector('.focus-duration');
const statusEl = document.querySelector('.focus-status');
const durationRadios = Array.from(document.querySelectorAll('input[name="focus-duration"]'));

let intervalId = null;
let endTime = null;
let activeMinutes = 5;
let isCompleting = false;

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
    if (focusToggle) focusToggle.checked = false;
    window.setTimeout(() => {
        isCompleting = false;
    }, 0);
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

const stopWhenInactive = () => {
    if (!focusToggle?.checked) return;
    if (isCompleting) return;
    const viewId = window.location.hash || '#view-home';
    if (viewId !== '#view-coach') {
        focusToggle.checked = false;
        stopSession(false);
    }
};

if (durationRadios.length) {
    durationRadios.forEach((radio) => {
        radio.addEventListener('change', () => {
            const minutes = getSelectedMinutes();
            setFocusDuration(minutes);
            if (focusToggle?.checked) {
                startSession();
            }
        });
    });
}

if (focusToggle) {
    focusToggle.addEventListener('change', handleToggle);
}

setFocusDuration(getSelectedMinutes());

window.addEventListener('hashchange', stopWhenInactive, { passive: true });
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopWhenInactive();
    }
});
window.addEventListener('pagehide', stopWhenInactive);

document.addEventListener('panda:persist-applied', () => {
    setFocusDuration(getSelectedMinutes());
});
