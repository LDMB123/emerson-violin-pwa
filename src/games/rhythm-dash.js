import {
    cachedEl,
    readLiveNumber,
    setLiveNumber,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    getTonePlayer,
} from './shared.js';
import { clamp } from '../utils/math.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { GAME_PLAY_AGAIN, RT_STATE, SOUNDS_CHANGE } from '../utils/event-names.js';
import { GAME_META } from './game-config.js';
import {
    computeBeatInterval,
    computeBpm,
    computeTimingScore,
    getRatingFromScore,
    computeNextCombo,
    computeScoreIncrement,
    computeAverageFromHistory,
    computeAccuracyFromTimingScores,
    computeAccuracyFromBpmHistory,
    getMetronomeNote,
    getMetronomeVolume,
    shouldMarkTapMilestone,
    shouldMarkComboMilestone,
    shouldMarkEnduranceMilestone,
    shouldShowComboStatus,
    formatComboStatus,
    formatRegularStatus,
} from '../utils/rhythm-dash-utils.js';

const rhythmScoreEl = cachedEl('[data-rhythm="score"]');
const rhythmComboEl = cachedEl('[data-rhythm="combo"]');
let resetRequestHandler = null;
let hashChangeHandler = null;
let visibilityHandler = null;
let soundsChangeHandler = null;
let pagehideHandler = null;
let realtimeStateHandler = null;
let tuningReport = null;

const cleanupRhythmDashBindings = () => {
    if (resetRequestHandler) {
        document.removeEventListener(GAME_PLAY_AGAIN, resetRequestHandler);
    }
    if (hashChangeHandler) {
        window.removeEventListener('hashchange', hashChangeHandler, { passive: true });
    }
    if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
    }
    if (soundsChangeHandler) {
        document.removeEventListener(SOUNDS_CHANGE, soundsChangeHandler);
    }
    if (pagehideHandler) {
        window.removeEventListener('pagehide', pagehideHandler, { passive: true });
    }
    if (realtimeStateHandler) {
        document.removeEventListener(RT_STATE, realtimeStateHandler);
    }
    if (tuningReport?.dispose) {
        tuningReport.dispose();
    }
};

const updateRhythmDash = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-rhythm-dash input[id^="rd-set-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = rhythmScoreEl();
    const comboEl = rhythmComboEl();
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');

    if (scoreEl) {
        scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : (checked * 25 + (checked === inputs.length ? 20 : 0)));
    }
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const bindRhythmDash = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-rhythm-dash');
    if (!stage) return;
    cleanupRhythmDashBindings();

    const tapButton = stage.querySelector('.rhythm-tap');
    const runToggle = stage.querySelector('#rhythm-run');
    const pauseButton = stage.querySelector('[data-rhythm="pause"]');
    const settingsButton = stage.querySelector('[data-rhythm="settings"]');
    const scoreEl = stage.querySelector('[data-rhythm="score"]');
    const comboEl = stage.querySelector('[data-rhythm="combo"]');
    const bpmEl = stage.querySelector('[data-rhythm="bpm"]');
    const suggestedEl = stage.querySelector('[data-rhythm="suggested"]');
    const statusEl = stage.querySelector('[data-rhythm="status"]');
    const ratingEl = stage.querySelector('[data-rhythm="rating"]');
    const meterFill = stage.querySelector('[data-rhythm="meter"]');
    const meterTrack = stage.querySelector('.rhythm-meter');
    const targetSlider = stage.querySelector('[data-rhythm="target-slider"]');
    const targetValue = stage.querySelector('[data-rhythm="target-value"]');
    const settingsReset = stage.querySelector('[data-rhythm="settings-reset"]');

    let combo = 0;
    let score = 0;
    let lastTap = 0;
    let wasRunning = false;
    let tapCount = 0;
    let runStartedAt = 0;
    let mistakes = 0;
    const tapHistory = [];
    const realtimeTempoHistory = [];
    let targetBpm = Math.round(90 * difficulty.speed);
    let coachTarget = targetBpm;
    let reported = false;
    let timingScores = [];
    let beatInterval = computeBeatInterval(targetBpm);
    let paused = false;
    let pausedByVisibility = false;
    let metronomeId = null;
    let metronomeBeat = 0;
    let realtimeListening = false;

    if (!tapButton) return;

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const setRating = (label, level, scoreValue) => {
        if (ratingEl) {
            ratingEl.textContent = `Timing: ${label}`;
            if (level) ratingEl.dataset.level = level;
        }
        if (meterFill) {
            const percent = clamp(scoreValue * 100, 0, 100);
            meterFill.style.width = `${percent}%`;
            if (meterTrack) {
                meterTrack.setAttribute('aria-valuenow', String(Math.round(percent)));
                meterTrack.setAttribute('aria-valuetext', `${Math.round(percent)}%`);
            }
        }
    };

    const updateTargetBpm = (value, { user = false } = {}) => {
        const next = clamp(Number(value) || targetBpm, 60, 140);
        targetBpm = next;
        beatInterval = computeBeatInterval(targetBpm);
        stage.style.setProperty('--beat-interval', `${(60 / targetBpm).toFixed(2)}s`);
        stage.style.setProperty('--beat-cycle', `${(60 / targetBpm * 8).toFixed(2)}s`);
        if (targetSlider) {
            targetSlider.value = String(next);
            targetSlider.setAttribute('aria-valuenow', String(next));
            targetSlider.setAttribute('aria-valuetext', `${next} BPM`);
            if (user) targetSlider.dataset.userSet = 'true';
        }
        if (targetValue) targetValue.textContent = `${next} BPM`;
        if (!wasRunning) {
            setStatus(`Tap Start to begin. Target ${targetBpm} BPM.`);
        }
        if (runToggle?.checked) {
            startMetronome();
        }
    };

    tuningReport = attachTuning('rhythm-dash', (tuning) => {
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (!wasRunning) {
            setStatus(`Tap Start to begin. Target ${targetBpm} BPM.`);
        }
    });

    const computeAccuracy = () => {
        if (timingScores.length) {
            return computeAccuracyFromTimingScores(timingScores);
        }
        return computeAccuracyFromBpmHistory(tapHistory, targetBpm);
    };

    const reportSession = () => {
        if (reported || tapCount === 0) return;
        reported = true;
        const accuracy = computeAccuracy();
        tuningReport?.({ score, accuracy });
        const objectiveTier = stage.dataset.gameObjectiveTier
            || (difficulty.complexity >= 2 ? 'mastery' : difficulty.complexity >= 1 ? 'core' : 'foundation');
        const objectiveTotal = GAME_META?.['rhythm-dash']?.objectivePacks?.[objectiveTier]?.length || 3;
        const objectivesCompleted = Math.min(
            objectiveTotal,
            ['rd-set-1', 'rd-set-2', 'rd-set-3']
                .map((id) => document.getElementById(id))
                .filter((input) => input instanceof HTMLInputElement && input.checked).length,
        );
        const difficultyLevel = difficulty.complexity >= 2 ? 'hard' : difficulty.complexity >= 1 ? 'medium' : 'easy';
        const sessionMs = runStartedAt ? Math.max(0, Date.now() - runStartedAt) : 0;
        recordGameEvent('rhythm-dash', {
            accuracy,
            score,
            difficulty: difficultyLevel,
            tier: objectiveTier,
            sessionMs,
            objectiveTotal,
            objectivesCompleted,
            mistakes,
        });
    };

    const stopMetronome = () => {
        if (metronomeId) {
            clearInterval(metronomeId);
            metronomeId = null;
        }
        metronomeBeat = 0;
    };

    const startMetronome = () => {
        stopMetronome();
        if (!isSoundEnabled()) return;
        const player = getTonePlayer();
        if (!player) return;
        const interval = Math.max(240, beatInterval);
        metronomeId = window.setInterval(() => {
            const note = getMetronomeNote(metronomeBeat);
            const volume = getMetronomeVolume(metronomeBeat);
            player.playNote(note, { duration: 0.08, volume, type: 'square' }).catch(() => {});
            metronomeBeat += 1;
        }, interval);
        player.playNote('E', { duration: 0.1, volume: 0.2, type: 'square' }).catch(() => {});
        metronomeBeat = 1;
    };

    const updateRunningState = () => {
        const running = runToggle?.checked;
        const wasActive = wasRunning;
        stage.classList.toggle('is-running', Boolean(running));
        if (running) {
            if (paused) {
                paused = false;
                setStatus(realtimeListening ? 'Run resumed. Follow the live beat.' : 'Run resumed. Mic off, tap fallback is active.');
            } else {
                setStatus(realtimeListening ? 'Run started. Bow on each beat.' : 'Run started. Tap fallback while listening starts.');
                if (!runStartedAt) runStartedAt = Date.now();
                reported = false;
                timingScores = [];
                setRating('--', 'off', 0);
            }
            startMetronome();
        } else {
            stopMetronome();
            if (!paused && wasActive && tapCount > 0) {
                reportSession();
            }
            if (paused) {
                setStatus('Run paused. Tap Start to resume.');
            } else {
                setStatus(wasActive ? 'Run paused. Tap Start to resume.' : `Tap Start to begin. Target ${targetBpm} BPM.`);
                lastTap = 0;
                tapHistory.length = 0;
                realtimeTempoHistory.length = 0;
                timingScores = [];
                tapCount = 0;
                runStartedAt = 0;
            }
        }
        wasRunning = Boolean(running);
    };

    const resetRun = () => {
        combo = 0;
        score = 0;
        lastTap = 0;
        tapCount = 0;
        mistakes = 0;
        runStartedAt = 0;
        tapHistory.length = 0;
        realtimeTempoHistory.length = 0;
        timingScores = [];
        reported = false;
        paused = false;
        pausedByVisibility = false;
        stopMetronome();
        if (runToggle) runToggle.checked = false;
        wasRunning = false;
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
        if (bpmEl) bpmEl.textContent = '--';
        setRating('--', 'off', 0);
        if (meterTrack) {
            meterTrack.setAttribute('aria-valuenow', '0');
            meterTrack.setAttribute('aria-valuetext', '0%');
        }
        updateRunningState();
    };

    const processBeat = (timingScore, { ratingSource = 'Mic', bpmValue = 0 } = {}) => {
        const boundedScore = clamp(timingScore, 0, 1);
        if (boundedScore < 0.45) {
            mistakes += 1;
        }
        combo = computeNextCombo(combo, boundedScore);
        const increment = computeScoreIncrement(boundedScore, combo);
        score += increment;
        tapCount += 1;
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);

        timingScores.push(boundedScore);
        if (timingScores.length > 16) timingScores.shift();

        const { rating, level } = getRatingFromScore(boundedScore);
        setRating(rating, level, boundedScore);

        if (Number.isFinite(bpmValue) && bpmValue > 0 && bpmEl) {
            bpmEl.textContent = String(Math.round(bpmValue));
        }
        if (shouldShowComboStatus(combo)) {
            setStatus(`${ratingSource}: ${formatComboStatus(rating, combo)}`);
        } else {
            setStatus(`${ratingSource}: ${formatRegularStatus(rating)}`);
        }

        markChecklistIf(shouldMarkTapMilestone(tapCount), 'rd-set-1');
        markChecklistIf(shouldMarkComboMilestone(combo), 'rd-set-2');
        const elapsed = runStartedAt ? (Date.now() - runStartedAt) : 0;
        markChecklistIf(shouldMarkEnduranceMilestone(tapCount, elapsed), 'rd-set-3');
    };

    runToggle?.addEventListener('change', updateRunningState);
    updateRunningState();
    if (targetSlider) {
        updateTargetBpm(targetSlider.value);
    }

    const pauseRun = (message) => {
        if (!runToggle?.checked) return;
        paused = true;
        runToggle.checked = false;
        updateRunningState();
        if (message) setStatus(message);
    };

    pauseButton?.addEventListener('click', () => {
        if (!runToggle) return;
        if (runToggle.checked) {
            pauseRun('Run paused. Tap Start to resume.');
            return;
        }
        if (paused) {
            runToggle.checked = true;
            updateRunningState();
            return;
        }
        paused = false;
        runToggle.checked = true;
        updateRunningState();
    });

    settingsButton?.addEventListener('click', () => {
        setStatus('Tip: keep bows even and steady for cleaner rhythm.');
    });

    targetSlider?.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        updateTargetBpm(target.value, { user: true });
    });

    settingsReset?.addEventListener('click', () => {
        if (targetSlider) delete targetSlider.dataset.userSet;
        updateTargetBpm(coachTarget);
        setStatus(`Target reset to ${coachTarget} BPM.`);
    });

    bindTap(tapButton, () => {
        if (runToggle && !runToggle.checked) {
            setStatus('Tap Start to run the lane.');
            return;
        }
        const now = performance.now();
        const delta = lastTap ? now - lastTap : 0;
        if (delta <= 0) {
            lastTap = now;
            setStatus('Tap once more to lock timing.');
            return;
        }

        const timingScore = computeTimingScore(delta, beatInterval);
        const bpm = computeBpm(delta);
        tapHistory.push(bpm);
        if (tapHistory.length > 6) tapHistory.shift();
        if (suggestedEl && tapHistory.length >= 2) {
            const avg = computeAverageFromHistory(tapHistory);
            suggestedEl.textContent = String(avg);
        }

        lastTap = now;
        processBeat(timingScore, { ratingSource: 'Tap fallback', bpmValue: bpm });
    });

    realtimeStateHandler = (event) => {
        if (window.location.hash !== '#view-game-rhythm-dash') return;
        const detail = event.detail || {};
        const feature = detail.lastFeature || null;
        realtimeListening = Boolean(detail.listening) && !detail.paused;

        if (!runToggle?.checked) return;
        if (!realtimeListening) {
            setStatus('Listening is paused. Keep going with tap fallback.');
            return;
        }
        if (!feature || !feature.hasSignal) {
            setStatus('Listening… play a clear bow stroke.');
            return;
        }

        const tempo = Number.isFinite(feature.tempoBpm) && feature.tempoBpm > 0
            ? feature.tempoBpm
            : 0;
        if (tempo > 0) {
            realtimeTempoHistory.push(Math.round(tempo));
            if (realtimeTempoHistory.length > 8) realtimeTempoHistory.shift();
            if (suggestedEl && realtimeTempoHistory.length >= 2) {
                suggestedEl.textContent = String(computeAverageFromHistory(realtimeTempoHistory));
            }
            if (bpmEl) bpmEl.textContent = String(Math.round(tempo));
        }

        if (!feature.onset) return;

        const rhythmOffset = Math.abs(Number.isFinite(feature.rhythmOffsetMs) ? feature.rhythmOffsetMs : beatInterval);
        const deltaForScore = Math.max(1, beatInterval - Math.min(rhythmOffset, beatInterval));
        const timingScore = computeTimingScore(deltaForScore, beatInterval);
        processBeat(timingScore, { ratingSource: 'Mic onset', bpmValue: tempo || targetBpm });
    };
    document.addEventListener(RT_STATE, realtimeStateHandler);

    hashChangeHandler = () => {
        if (window.location.hash === '#view-game-rhythm-dash') {
            resetRun();
            return;
        }
        if (runToggle?.checked) {
            runToggle.checked = false;
            runToggle.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            reportSession();
        }
    };
    window.addEventListener('hashchange', hashChangeHandler, { passive: true });

    resetRequestHandler = (event) => {
        const requestedViewId = event?.detail?.viewId;
        if (requestedViewId && requestedViewId !== 'view-game-rhythm-dash') return;
        if (window.location.hash !== '#view-game-rhythm-dash') return;
        resetRun();
    };
    document.addEventListener(GAME_PLAY_AGAIN, resetRequestHandler);

    visibilityHandler = () => {
        if (document.hidden) {
            if (runToggle?.checked) {
                pausedByVisibility = true;
                pauseRun('Paused while app is in the background.');
            }
        } else if (pausedByVisibility) {
            pausedByVisibility = false;
            setStatus('Run paused. Tap Start to resume.');
        }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    soundsChangeHandler = (event) => {
        if (event.detail?.enabled === false) {
            stopMetronome();
        } else if (runToggle?.checked) {
            startMetronome();
        }
    };
    document.addEventListener(SOUNDS_CHANGE, soundsChangeHandler);

    pagehideHandler = (event) => {
        if (window.location.hash !== '#view-game-rhythm-dash') return;
        if (event?.persisted) return;
        if (runToggle?.checked) {
            runToggle.checked = false;
            runToggle.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
        stopMetronome();
        reportSession();
    };
    window.addEventListener('pagehide', pagehideHandler, { passive: true });
};

export { updateRhythmDash as update, bindRhythmDash as bind };
