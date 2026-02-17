import {
    cachedEl,
    clamp,
    readLiveNumber,
    setLiveNumber,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    getTonePlayer,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';
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

const bindRhythmDash = () => {
    const stage = document.querySelector('#view-game-rhythm-dash');
    if (!stage) return;
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
    const tapHistory = [];
    let targetBpm = 90;
    let coachTarget = targetBpm;
    let reported = false;
    let timingScores = [];
    let beatInterval = 60000 / targetBpm;
    let paused = false;
    let pausedByVisibility = false;
    let metronomeId = null;
    let metronomeBeat = 0;

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
            setStatus(`Tap Start to begin the run. Target ${targetBpm} BPM.`);
        }
        if (runToggle?.checked) {
            startMetronome();
        }
    };

    const reportResult = attachTuning('rhythm-dash', (tuning) => {
        coachTarget = tuning.targetBpm ?? coachTarget;
        if (!(targetSlider && targetSlider.dataset.userSet)) {
            updateTargetBpm(coachTarget);
        } else if (suggestedEl) {
            suggestedEl.textContent = String(coachTarget);
        }
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (suggestedEl && !tapHistory.length) suggestedEl.textContent = String(coachTarget);
        if (!wasRunning) {
            setStatus(`Tap Start to begin the run. Target ${targetBpm} BPM.`);
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
        reportResult({ score, accuracy });
        recordGameEvent('rhythm-dash', { accuracy, score });
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
                setStatus('Run resumed. Tap the beat in the hit zone.');
            } else {
                setStatus('Run started. Tap the beat in the hit zone.');
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
                setStatus(wasActive ? 'Run paused. Tap Start to resume.' : `Tap Start to begin the run. Target ${targetBpm} BPM.`);
                lastTap = 0;
                tapHistory.length = 0;
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
        runStartedAt = 0;
        tapHistory.length = 0;
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
        setStatus('Tip: watch the hit zone and tap evenly for combos.');
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
            setStatus('Tap Start to run the lanes.');
            return;
        }
        const now = performance.now();
        const delta = lastTap ? now - lastTap : 0;
        let timingScore = 0;
        let rating = 'Off';
        let level = 'off';
        if (delta > 0) {
            timingScore = computeTimingScore(delta, beatInterval);
            const result = getRatingFromScore(timingScore);
            rating = result.rating;
            level = result.level;
        }
        combo = computeNextCombo(combo, timingScore);
        const increment = computeScoreIncrement(timingScore, combo);
        score += increment;
        tapCount += 1;
        setLiveNumber(scoreEl, 'liveScore', score);
        setLiveNumber(comboEl, 'liveCombo', combo, (value) => `x${value}`);
        if (delta > 0 && bpmEl) {
            const bpm = computeBpm(delta);
            bpmEl.textContent = String(bpm);
            tapHistory.push(bpm);
            if (tapHistory.length > 4) tapHistory.shift();
            if (suggestedEl && tapHistory.length >= 2) {
                const avg = computeAverageFromHistory(tapHistory);
                suggestedEl.textContent = String(avg);
            }
        }
        lastTap = now;
        if (delta > 0) {
            timingScores.push(timingScore);
            if (timingScores.length > 12) timingScores.shift();
            setRating(rating, level, timingScore);
        }
        if (shouldShowComboStatus(combo)) {
            setStatus(formatComboStatus(rating, combo));
        } else {
            setStatus(formatRegularStatus(rating));
        }
        markChecklistIf(shouldMarkTapMilestone(tapCount), 'rd-set-1');
        markChecklistIf(shouldMarkComboMilestone(combo), 'rd-set-2');
        const elapsed = runStartedAt ? (Date.now() - runStartedAt) : 0;
        markChecklistIf(shouldMarkEnduranceMilestone(tapCount, elapsed), 'rd-set-3');
    });

    window.addEventListener('hashchange', () => {
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
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (runToggle?.checked) {
                pausedByVisibility = true;
                pauseRun('Paused while app is in the background.');
            }
        } else if (pausedByVisibility) {
            pausedByVisibility = false;
            setStatus('Run paused. Tap Start to resume.');
        }
    });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            stopMetronome();
        } else if (runToggle?.checked) {
            startMetronome();
        }
    });
};

export { updateRhythmDash as update, bindRhythmDash as bind };
