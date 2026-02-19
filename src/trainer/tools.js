import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { hasAudioContextSupport } from '../audio/audio-context.js';
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
    shouldClearTapTimes,
    isBfcachePagehide,
} from './trainer-utils.js';

const DEFAULT_BPM = 100;

let metronomeSlider = null;
let metronomeBpmEl = null;
let metronomeToggle = null;
let metronomeTap = null;
let metronomeStatus = null;
let dialNumber = null;
let metronomeVisual = null;

let postureInput = null;
let posturePreview = null;
let postureImage = null;
let postureClear = null;
let postureHint = null;

let bowingIntro = null;
let bowingChecks = [];
let audioCards = [];

let metronomeBpm = DEFAULT_BPM;
let metronomeTimer = null;
let metronomePlayer = null;
let tapTimes = [];
let targetBpm = 90;
let metronomeReported = false;
let metronomeTouched = false;

let postureCount = 0;
let postureTarget = 2;
let postureReported = false;
let postureUrl = null;

let bowingTarget = 3;
let bowingReported = false;

let globalListenersBound = false;

const isPracticeView = () => {
    const viewId = window.location.hash.replace('#', '') || 'view-home';
    return isPracticeViewUtil(viewId);
};

const resolveElements = () => {
    metronomeSlider = document.querySelector('[data-metronome="slider"]');
    metronomeBpmEl = document.querySelector('[data-metronome="bpm"]');
    metronomeToggle = document.querySelector('[data-metronome="toggle"]');
    metronomeTap = document.querySelector('[data-metronome="tap"]');
    metronomeStatus = document.querySelector('[data-metronome="status"]');
    dialNumber = document.querySelector('.trainer-dial .dial-number');
    metronomeVisual = document.querySelector('.trainer-metronome');

    postureInput = document.querySelector('#posture-capture');
    posturePreview = document.querySelector('[data-posture-preview]');
    postureImage = document.querySelector('[data-posture-image]');
    postureClear = document.querySelector('[data-posture-clear]');
    postureHint = document.querySelector('.posture-hint');

    const bowingView = document.querySelector('#view-bowing');
    bowingIntro = bowingView?.querySelector('.game-drill-intro') || null;
    bowingChecks = Array.from(document.querySelectorAll('#view-bowing input[id^="bow-set-"]'));

    audioCards = Array.from(document.querySelectorAll('.audio-card'));
};

function updateSliderFill(slider) {
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const val = Number(slider.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-fill', `${pct}%`);
}

const updateMetronomeDisplay = () => {
    if (metronomeBpmEl) metronomeBpmEl.textContent = `${metronomeBpm} BPM`;
    if (dialNumber) dialNumber.textContent = String(metronomeBpm);
    if (metronomeSlider) {
        metronomeSlider.setAttribute('aria-valuenow', String(metronomeBpm));
        metronomeSlider.setAttribute('aria-valuetext', `${metronomeBpm} BPM`);
        metronomeSlider.value = String(metronomeBpm);
        updateSliderFill(metronomeSlider);
    }
    if (metronomeVisual) {
        const duration = 60 / metronomeBpm;
        metronomeVisual.style.setProperty('--metronome-speed', `${duration}s`);
    }
};

const setMetronomeStatus = (message) => {
    if (metronomeStatus) metronomeStatus.textContent = message;
};

const syncMetronomeRunningState = () => {
    const running = Boolean(metronomeTimer);
    if (metronomeToggle) {
        metronomeToggle.textContent = running ? 'Stop' : 'Start';
        metronomeToggle.setAttribute('aria-pressed', running ? 'true' : 'false');
    }
    if (metronomeVisual) {
        metronomeVisual.classList.toggle('is-running', running);
    }
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
    if (!metronomePlayer) {
        metronomePlayer = createTonePlayer();
    }
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
    syncMetronomeRunningState();
    if (!silent) {
        setMetronomeStatus('Metronome paused.');
    }
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
    syncMetronomeRunningState();
    setMetronomeStatus(`Running at ${metronomeBpm} BPM.`);
};

const refreshMetronome = () => {
    if (metronomeTimer) {
        stopMetronome({ silent: true });
        startMetronome();
        return;
    }
    updateMetronomeDisplay();
};

const updateBpm = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    metronomeBpm = clampBpm(parsed);
    updateMetronomeDisplay();
    refreshMetronome();
};

const bindRangeInputs = () => {
    document.querySelectorAll('input[type="range"]').forEach((slider) => {
        updateSliderFill(slider);
        if (slider.dataset.sliderFillBound === 'true') return;
        slider.dataset.sliderFillBound = 'true';
        slider.addEventListener('input', () => updateSliderFill(slider));
    });
};

const bindMetronomeControls = () => {
    if (metronomeSlider && metronomeSlider.dataset.metronomeBound !== 'true') {
        metronomeSlider.dataset.metronomeBound = 'true';
        metronomeSlider.addEventListener('input', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            target.dataset.userSet = 'true';
            metronomeReported = false;
            metronomeTouched = true;
            updateBpm(target.value);
            updateSliderFill(target);
        });
    }

    if (metronomeToggle && metronomeToggle.dataset.metronomeBound !== 'true') {
        metronomeToggle.dataset.metronomeBound = 'true';
        metronomeToggle.addEventListener('click', () => {
            if (metronomeTimer) {
                stopMetronome();
                return;
            }
            metronomeTouched = true;
            startMetronome();
        });
    }

    if (metronomeTap && metronomeTap.dataset.metronomeBound !== 'true') {
        metronomeTap.dataset.metronomeBound = 'true';
        metronomeTap.addEventListener('click', () => {
            const now = performance.now();
            if (tapTimes.length && shouldClearTapTimes(tapTimes[tapTimes.length - 1], now)) {
                tapTimes = [];
            }
            tapTimes.push(now);
            if (tapTimes.length > 5) {
                tapTimes.shift();
            }

            if (tapTimes.length < 2) {
                setMetronomeStatus('Tap again to set tempo.');
                return;
            }

            const intervals = tapTimes.slice(1).map((time, index) => time - tapTimes[index]);
            const bpm = calculateMetronomeBpm(intervals);
            if (metronomeSlider) {
                metronomeSlider.dataset.userSet = 'true';
            }
            metronomeReported = false;
            metronomeTouched = true;
            updateBpm(bpm);
            setMetronomeStatus(`Tempo set to ${metronomeBpm} BPM.`);
            reportMetronome();
        });
    }
};

const bindAudioCards = () => {
    audioCards.forEach((card) => {
        const audio = card.querySelector('audio');
        if (!audio || audio.dataset.trainerAudioBound === 'true') return;

        audio.dataset.trainerAudioBound = 'true';
        const update = () => {
            card.classList.toggle('is-playing', !audio.paused);
        };

        audio.addEventListener('play', () => {
            document.querySelectorAll('.audio-card').forEach((other) => {
                if (other !== card) {
                    other.classList.remove('is-playing');
                }
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

const clearPosturePreview = () => {
    if (postureUrl) {
        URL.revokeObjectURL(postureUrl);
        postureUrl = null;
    }
    if (postureImage) {
        postureImage.removeAttribute('src');
    }
    if (posturePreview) {
        posturePreview.hidden = true;
    }
    if (postureInput) {
        postureInput.value = '';
    }
};

const bindPostureControls = () => {
    if (postureInput && postureInput.dataset.postureBound !== 'true') {
        postureInput.dataset.postureBound = 'true';
        postureInput.addEventListener('change', () => {
            const file = postureInput.files?.[0];
            if (!file) {
                clearPosturePreview();
                return;
            }

            clearPosturePreview();
            postureUrl = URL.createObjectURL(file);
            if (postureImage) {
                postureImage.src = postureUrl;
            }
            if (posturePreview) {
                posturePreview.hidden = false;
            }
            postureCount += 1;
            postureReported = false;
            updatePostureHint();
        });
    }

    if (postureClear && postureClear.dataset.postureBound !== 'true') {
        postureClear.dataset.postureBound = 'true';
        postureClear.addEventListener('click', () => {
            clearPosturePreview();
            reportPosture();
        });
    }
};

const updateBowingIntro = () => {
    if (!bowingIntro) return;
    const base = bowingIntro.dataset.baseText || bowingIntro.textContent || '';
    if (!bowingIntro.dataset.baseText) {
        bowingIntro.dataset.baseText = base;
    }
    bowingIntro.textContent = formatBowingIntroText(base, bowingTarget);
};

const reportBowing = () => {
    if (bowingReported || !bowingChecks.length) return;
    const completed = bowingChecks.filter((input) => input.checked).length;
    if (!completed) return;

    bowingReported = true;
    const accuracy = calculateBowingAccuracy(completed, bowingTarget);
    const score = calculateBowingScore(completed);
    updateGameResult('bowing-coach', { accuracy, score }).catch(() => {});
};

const bindBowingControls = () => {
    bowingChecks.forEach((input) => {
        if (input.dataset.bowingBound === 'true') return;
        input.dataset.bowingBound = 'true';
        input.addEventListener('change', () => {
            bowingReported = false;
            updateBowingIntro();
            const completed = bowingChecks.filter((item) => item.checked).length;
            if (completed >= bowingTarget) {
                reportBowing();
            }
        });
    });
};

async function applyPostureTuning() {
    const tuning = await getGameTuning('trainer-posture');
    postureTarget = tuning.targetChecks ?? postureTarget;
    setDifficultyBadge(document.querySelector('#view-posture .view-header'), tuning.difficulty, 'Posture');
    updatePostureHint();
}

async function applyBowingTuning() {
    const tuning = await getGameTuning('bowing-coach');
    bowingTarget = tuning.targetSets ?? bowingTarget;
    setDifficultyBadge(document.querySelector('#view-bowing .view-header'), tuning.difficulty, 'Bowing');
    updateBowingIntro();
}

const bindGlobalListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopMetronome({ silent: true });
        }
    });

    window.addEventListener('pagehide', (event) => {
        if (isBfcachePagehide(event)) return;
        reportMetronome();
        stopMetronome({ silent: true });
        reportPosture();
        clearPosturePreview();
    });

    window.addEventListener('hashchange', () => {
        if (!isPracticeView()) {
            reportMetronome();
            stopMetronome({ silent: true });
        }
        if (window.location.hash !== '#view-posture') {
            reportPosture();
            clearPosturePreview();
        }
        if (window.location.hash !== '#view-bowing') {
            reportBowing();
        }
    }, { passive: true });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            stopMetronome({ silent: true });
            setMetronomeStatus('Sounds are off.');
        }
    });

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
        resolveElements();
        if (metronomeSlider) {
            delete metronomeSlider.dataset.userSet;
        }
        metronomeReported = false;
        applyMetronomeTuning();

        postureReported = false;
        applyPostureTuning();

        bowingReported = false;
        applyBowingTuning();
    });
};

const initTrainerTools = () => {
    resolveElements();
    bindGlobalListeners();

    if (!hasAudioContextSupport()) {
        if (metronomeToggle) metronomeToggle.disabled = true;
        if (metronomeTap) metronomeTap.disabled = true;
        setMetronomeStatus('Audio tools are not supported on this device.');
    }

    bindRangeInputs();
    bindMetronomeControls();
    bindAudioCards();
    bindBowingControls();
    bindPostureControls();

    updateMetronomeDisplay();
    syncMetronomeRunningState();
    updatePostureHint();
    updateBowingIntro();

    applyMetronomeTuning();
    applyPostureTuning();
    applyBowingTuning();
};

export const init = initTrainerTools;
