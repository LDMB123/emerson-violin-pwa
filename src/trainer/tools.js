import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE, ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { setDifficultyBadge } from '../games/shared.js';
import { createTonePlayer } from '../audio/tone-player.js';
import {
    isPracticeView as isPracticeViewUtil,
    calculateMetronomeBpm,
    calculateMetronomeInterval,
    clampBpm,
    calculateMetronomeAccuracy,
    calculatePostureAccuracy,
    calculatePostureScore,
    calculateBowingAccuracy,
    calculateBowingScore,
    formatPostureHint,
    formatBowingIntroText,
    shouldClearTapTimes
} from './trainer-utils.js';

function updateSliderFill(slider) {
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const val = Number(slider.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-fill', `${pct}%`);
}

const metronomeSlider = document.querySelector('[data-metronome="slider"]');
const metronomeBpmEl = document.querySelector('[data-metronome="bpm"]');
const metronomeToggle = document.querySelector('[data-metronome="toggle"]');
const metronomeTap = document.querySelector('[data-metronome="tap"]');
const metronomeStatus = document.querySelector('[data-metronome="status"]');
const dialNumber = document.querySelector('.trainer-dial .dial-number');
const metronomeVisual = document.querySelector('.trainer-metronome');

const postureInput = document.querySelector('#posture-capture');
const posturePreview = document.querySelector('[data-posture-preview]');
const postureImage = document.querySelector('[data-posture-image]');
const postureClear = document.querySelector('[data-posture-clear]');
const postureHint = document.querySelector('.posture-hint');

const bowingView = document.querySelector('#view-bowing');
const bowingIntro = bowingView?.querySelector('.game-drill-intro');
const bowingChecks = Array.from(document.querySelectorAll('#view-bowing input[id^="bow-set-"]'));

const isPracticeView = () => {
    const viewId = window.location.hash.replace('#', '') || 'view-home';
    return isPracticeViewUtil(viewId);
};

let metronomeBpm = Number.parseInt(metronomeSlider?.value || '100', 10);
if (Number.isNaN(metronomeBpm)) metronomeBpm = 100;

let metronomeTimer = null;
let metronomePlayer = null;
let tapTimes = [];
let targetBpm = 90;
let metronomeReported = false;
let metronomeTouched = false;
let postureCount = 0;
let postureTarget = 2;
let postureReported = false;
let bowingTarget = 3;
let bowingReported = false;
let bowingLastReported = 0;


const updateMetronomeDisplay = () => {
    if (metronomeBpmEl) metronomeBpmEl.textContent = `${metronomeBpm} BPM`;
    if (dialNumber) dialNumber.textContent = String(metronomeBpm);
    if (metronomeSlider) {
        metronomeSlider.setAttribute('aria-valuenow', String(metronomeBpm));
        metronomeSlider.setAttribute('aria-valuetext', `${metronomeBpm} BPM`);
    }
    if (metronomeVisual) {
        const duration = 60 / metronomeBpm;
        metronomeVisual.style.setProperty('--metronome-speed', `${duration}s`);
    }
};

const setMetronomeStatus = (message) => {
    if (metronomeStatus) metronomeStatus.textContent = message;
};

const reportMetronome = () => {
    if (metronomeReported || !targetBpm || !metronomeTouched) return;
    metronomeReported = true;
    metronomeTouched = false;
    const accuracy = calculateMetronomeAccuracy(metronomeBpm, targetBpm);
    updateGameResult('trainer-metronome', { accuracy, score: metronomeBpm }).catch(() => {});
};

const applyMetronomeTuning = async () => {
    const tuning = await getGameTuning('trainer-metronome');
    targetBpm = tuning.targetBpm ?? targetBpm;
    setDifficultyBadge(document.querySelector('#metronome-loops .audio-panel-header'), tuning.difficulty, 'Tempo');
    if (metronomeSlider && !metronomeSlider.dataset.userSet) {
        updateBpm(targetBpm);
    }
    if (!metronomeTimer) {
        setMetronomeStatus(`Suggested tempo: ${targetBpm} BPM.`);
    }
};

const getMetronomePlayer = () => {
    if (!metronomePlayer) metronomePlayer = createTonePlayer();
    return metronomePlayer;
};

const playClick = () => {
    if (!isSoundEnabled()) return;
    getMetronomePlayer().scheduleTone(880, { duration: 0.08, volume: 0.18 });
};

const stopMetronome = ({ silent = false } = {}) => {
    if (!silent) {
        reportMetronome();
    }
    if (metronomeTimer) {
        clearInterval(metronomeTimer);
        metronomeTimer = null;
    }
    tapTimes = [];
    if (metronomeToggle) {
        metronomeToggle.textContent = 'Start';
        metronomeToggle.setAttribute('aria-pressed', 'false');
    }
    if (metronomeVisual) metronomeVisual.classList.remove('is-running');
    if (!silent) setMetronomeStatus('Metronome paused.');
};

const startMetronome = () => {
    if (metronomeTimer) return;
    if (!isSoundEnabled()) {
        setMetronomeStatus('Sounds are off. Turn on Sounds to hear the click.');
        return;
    }
    const interval = calculateMetronomeInterval(metronomeBpm);
    playClick();
    metronomeTimer = window.setInterval(playClick, interval);
    if (metronomeToggle) {
        metronomeToggle.textContent = 'Stop';
        metronomeToggle.setAttribute('aria-pressed', 'true');
    }
    if (metronomeVisual) metronomeVisual.classList.add('is-running');
    setMetronomeStatus(`Running at ${metronomeBpm} BPM.`);
};

const refreshMetronome = () => {
    if (metronomeTimer) {
        stopMetronome({ silent: true });
        startMetronome();
    } else {
        updateMetronomeDisplay();
    }
};

const updateBpm = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    metronomeBpm = clampBpm(parsed);
    if (metronomeSlider) metronomeSlider.value = String(metronomeBpm);
    updateMetronomeDisplay();
    refreshMetronome();
};

if (metronomeSlider) {
    metronomeSlider.dataset.sliderFillBound = 'true';
    metronomeSlider.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        metronomeSlider.dataset.userSet = 'true';
        metronomeReported = false;
        metronomeTouched = true;
        updateBpm(target.value);
        updateSliderFill(metronomeSlider);
    });
}

metronomeToggle?.addEventListener('click', () => {
    if (metronomeTimer) {
        stopMetronome();
        return;
    }
    metronomeTouched = true;
    startMetronome();
});

metronomeTap?.addEventListener('click', () => {
    const now = performance.now();
    if (tapTimes.length && shouldClearTapTimes(tapTimes[tapTimes.length - 1], now)) {
        tapTimes = [];
    }
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    if (tapTimes.length >= 2) {
        const intervals = tapTimes.slice(1).map((time, index) => time - tapTimes[index]);
        const bpm = calculateMetronomeBpm(intervals);
        if (metronomeSlider) metronomeSlider.dataset.userSet = 'true';
        metronomeReported = false;
        metronomeTouched = true;
        updateBpm(bpm);
        setMetronomeStatus(`Tempo set to ${metronomeBpm} BPM.`);
        reportMetronome();
    } else {
        setMetronomeStatus('Tap again to set tempo.');
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopMetronome({ silent: true });
    }
});

window.addEventListener('pagehide', () => {
    reportMetronome();
    stopMetronome({ silent: true });
});

window.addEventListener('hashchange', () => {
    if (!isPracticeView()) {
        reportMetronome();
        stopMetronome({ silent: true });
    }
}, { passive: true });

document.addEventListener(SOUNDS_CHANGE, (event) => {
    if (event.detail?.enabled === false) {
        stopMetronome({ silent: true });
        setMetronomeStatus('Sounds are off.');
    }
});

updateMetronomeDisplay();

document.querySelectorAll('input[type="range"]').forEach((s) => {
    updateSliderFill(s);
    if (!s.dataset.sliderFillBound) {
        s.dataset.sliderFillBound = 'true';
        s.addEventListener('input', () => updateSliderFill(s));
    }
});

applyMetronomeTuning();
applyPostureTuning();
applyBowingTuning();

window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#view-posture') {
        reportPosture();
    }
    if (window.location.hash !== '#view-bowing') {
        reportBowing();
    }
}, { passive: true });

document.addEventListener(ML_UPDATE, (event) => {
    if (event.detail?.id === 'trainer-metronome') {
        metronomeReported = false;
        applyMetronomeTuning();
    }
    if (event.detail?.id === 'trainer-posture') {
        postureReported = false;
        applyPostureTuning();
    }
    if (event.detail?.id === 'bowing-coach') {
        bowingReported = false;
        applyBowingTuning();
    }
});

document.addEventListener(ML_RESET, () => {
    if (metronomeSlider) delete metronomeSlider.dataset.userSet;
    metronomeReported = false;
    applyMetronomeTuning();
    postureReported = false;
    applyPostureTuning();
    bowingReported = false;
    applyBowingTuning();
});

const audioCards = Array.from(document.querySelectorAll('.audio-card'));
audioCards.forEach((card) => {
    const audio = card.querySelector('audio');
    if (!audio) return;
    const update = () => {
        card.classList.toggle('is-playing', !audio.paused);
    };
    audio.addEventListener('play', () => {
        audioCards.forEach((other) => {
            if (other !== card) other.classList.remove('is-playing');
        });
        if (metronomeTimer) {
            stopMetronome({ silent: true });
            setMetronomeStatus('Metronome paused while audio plays.');
        }
        update();
    });
    audio.addEventListener('pause', update);
    audio.addEventListener('ended', update);
});

if (bowingChecks.length) {
    bowingChecks.forEach((input) => {
        input.addEventListener('change', () => {
            bowingReported = false;
            updateBowingIntro();
            const completed = bowingChecks.filter((item) => item.checked).length;
            if (completed >= bowingTarget) {
                reportBowing();
            }
        });
    });
}

let postureUrl = null;
const clearPosturePreview = () => {
    if (postureUrl) {
        URL.revokeObjectURL(postureUrl);
        postureUrl = null;
    }
    if (postureImage) postureImage.removeAttribute('src');
    if (posturePreview) posturePreview.hidden = true;
    if (postureInput) postureInput.value = '';
};

const updatePostureHint = () => {
    if (!postureHint) return;
    postureHint.textContent = formatPostureHint(postureCount, postureTarget);
};

const reportPosture = () => {
    if (postureReported || postureCount === 0) return;
    postureReported = true;
    const accuracy = calculatePostureAccuracy(postureCount, postureTarget);
    const score = calculatePostureScore(postureCount);
    updateGameResult('trainer-posture', { accuracy, score }).catch(() => {});
};

async function applyPostureTuning() {
    const tuning = await getGameTuning('trainer-posture');
    postureTarget = tuning.targetChecks ?? postureTarget;
    setDifficultyBadge(document.querySelector('#view-posture .view-header'), tuning.difficulty, 'Posture');
    updatePostureHint();
}

const updateBowingIntro = () => {
    if (!bowingIntro) return;
    const base = bowingIntro.dataset.baseText || bowingIntro.textContent || '';
    if (!bowingIntro.dataset.baseText) bowingIntro.dataset.baseText = base;
    bowingIntro.textContent = formatBowingIntroText(base, bowingTarget);
};

const reportBowing = () => {
    if (bowingReported || !bowingChecks.length) return;
    const completed = bowingChecks.filter((input) => input.checked).length;
    if (!completed || completed === bowingLastReported) return;
    bowingReported = true;
    bowingLastReported = completed;
    const accuracy = calculateBowingAccuracy(completed, bowingTarget);
    const score = calculateBowingScore(completed);
    updateGameResult('bowing-coach', { accuracy, score }).catch(() => {});
};

async function applyBowingTuning() {
    const tuning = await getGameTuning('bowing-coach');
    bowingTarget = tuning.targetSets ?? bowingTarget;
    setDifficultyBadge(document.querySelector('#view-bowing .view-header'), tuning.difficulty, 'Bowing');
    updateBowingIntro();
}

postureInput?.addEventListener('change', () => {
    const file = postureInput.files?.[0];
    if (!file) {
        clearPosturePreview();
        return;
    }
    clearPosturePreview();
    postureUrl = URL.createObjectURL(file);
    if (postureImage) postureImage.src = postureUrl;
    if (posturePreview) posturePreview.hidden = false;
    postureCount += 1;
    postureReported = false;
    updatePostureHint();
});

postureClear?.addEventListener('click', () => {
    clearPosturePreview();
    reportPosture();
});

window.addEventListener('pagehide', () => {
    reportPosture();
    clearPosturePreview();
});

if (typeof AudioContext === 'undefined') {
    if (metronomeToggle) metronomeToggle.disabled = true;
    if (metronomeTap) metronomeTap.disabled = true;
    setMetronomeStatus('Audio tools are not supported on this device.');
}
