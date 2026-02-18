import { createGame } from './game-shell.js';
import {
    cachedEl,
    formatCountdown,
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    markChecklistIf,
    bindTap,
    playToneNote,
} from './shared.js';

const bowStarsEl = cachedEl('[data-bow="stars"]');

const updateBowHero = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-bow-hero input[id^="bh-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const starsEl = bowStarsEl();
    const liveStars = readLiveNumber(starsEl, 'liveStars');
    if (starsEl) starsEl.textContent = String(Number.isFinite(liveStars) ? liveStars : checked);
};

const { bind } = createGame({
    id: 'bow-hero',
    computeAccuracy: (state) => state._stars && state._stars.length
        ? (state.starCount / state._stars.length) * 100
        : 0,
    onReset: (gameState) => {
        // Only fully reset if timer isn't running (tuning change mid-run should not reset)
        if (gameState._timerId) return;
        gameState.starCount = 0;
        gameState.strokeCount = 0;
        if (gameState._stars) {
            gameState._stars.forEach((star) => star.classList.remove('is-lit'));
        }
        if (gameState._starsEl) setLiveNumber(gameState._starsEl, 'liveStars', 0);
        if (gameState._timerEl) gameState._timerEl.textContent = formatCountdown(gameState._timeLimit || 0);
        if (gameState._statusEl) gameState._statusEl.textContent = 'Press Start to begin the timer.';
        if (gameState._runToggle) gameState._runToggle.checked = false;
    },
    onBind: (stage, difficulty, { reportSession, gameState }) => {
        const strokeButton = stage.querySelector('.bow-stroke');
        const runToggle = stage.querySelector('#bow-hero-run');
        const timerEl = stage.querySelector('[data-bow="timer"]');
        const stars = Array.from(stage.querySelectorAll('.bow-star'));
        const starsEl = stage.querySelector('[data-bow="stars"]');
        const statusEl = stage.querySelector('[data-bow="status"]');

        let starCount = 0;
        let strokeCount = 0;
        // difficulty.speed: scales targetTempo and timeLimit; speed=1.0 keeps targetTempo=72, timeLimit=105 (current behavior)
        // difficulty.complexity: visual feedback only for this game (star/stroke milestones are fixed)
        const targetTempo = Math.round(72 * difficulty.speed);
        const timeLimit = Math.round(105 * difficulty.speed);
        let remaining = timeLimit;
        let timerId = null;
        let endTime = null;
        let runStartedAt = 0;
        let paused = false;
        let pausedAt = 0;
        let lastStrokeAt = 0;
        let smoothStreak = 0;

        // Store on gameState for computeAccuracy and onReset
        gameState._stars = stars;
        gameState._starsEl = starsEl;
        gameState._timerEl = timerEl;
        gameState._statusEl = statusEl;
        gameState._runToggle = runToggle;
        gameState._timeLimit = timeLimit;
        gameState._timerId = null; // track for onReset guard

        const setStatus = (message) => {
            if (statusEl) statusEl.textContent = message;
        };

        const updateTimer = () => {
            if (timerEl) timerEl.textContent = formatCountdown(remaining);
        };

        const resetStars = () => {
            starCount = 0;
            strokeCount = 0;
            gameState.starCount = 0;
            gameState.strokeCount = 0;
            stars.forEach((star) => star.classList.remove('is-lit'));
            setLiveNumber(starsEl, 'liveStars', starCount);
        };

        const finalizeRun = () => {
            gameState.starCount = starCount;
            gameState.strokeCount = strokeCount;
            gameState.score = starCount * 20 + strokeCount * 2;
            reportSession();
        };

        const stopTimer = () => {
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
            endTime = null;
            gameState._timerId = null;
        };

        const pauseTimer = () => {
            if (!timerId) return;
            if (endTime) {
                remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            }
            stopTimer();
            paused = true;
            pausedAt = Date.now();
            setStatus('Paused while app is in the background.');
        };

        gameState._onDeactivate = () => {
            pauseTimer();
        };

        const resumeTimer = () => {
            if (!paused) return;
            if (!runToggle?.checked) return;
            if (window.location.hash !== '#view-game-bow-hero') return;
            if (remaining <= 0) return;
            if (pausedAt && runStartedAt) {
                runStartedAt += Date.now() - pausedAt;
            }
            paused = false;
            pausedAt = 0;
            startTimer();
        };

        const startTimer = () => {
            if (timerId) return;
            paused = false;
            if (remaining <= 0) remaining = timeLimit;
            if (remaining === timeLimit && starCount > 0) resetStars();
            if (!runStartedAt) runStartedAt = Date.now();
            endTime = Date.now() + remaining * 1000;
            timerId = window.setInterval(() => {
                if (!endTime) return;
                remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
                updateTimer();
                if (remaining <= 0) {
                    stopTimer();
                    if (runToggle) runToggle.checked = false;
                    setStatus('Time! Tap Start to begin another round.');
                    markChecklist('bh-step-5');
                    finalizeRun();
                }
                if (runStartedAt && Date.now() - runStartedAt >= 30000) {
                    markChecklist('bh-step-4');
                }
            }, 300);
            gameState._timerId = timerId;
            updateTimer();
            setStatus('Timer running. Keep bow strokes steady.');
        };

        bindTap(strokeButton, () => {
            starCount = Math.min(stars.length, starCount + 1);
            strokeCount += 1;
            stars.forEach((star, index) => {
                star.classList.toggle('is-lit', index < starCount);
            });
            setLiveNumber(starsEl, 'liveStars', starCount);
            const now = performance.now();
            if (lastStrokeAt) {
                const interval = now - lastStrokeAt;
                const bpm = Math.round(60000 / Math.max(120, interval));
                const deviation = Math.abs(bpm - targetTempo) / Math.max(targetTempo, 1);
                if (deviation <= 0.18) {
                    smoothStreak += 1;
                    setStatus(`Smooth strokes! ${bpm} BPM · streak x${smoothStreak}.`);
                } else {
                    smoothStreak = 0;
                    setStatus(`Aim for ${targetTempo} BPM · current ${bpm} BPM.`);
                }
            } else {
                setStatus('Nice stroke! Keep going.');
            }
            lastStrokeAt = now;
            const strokeNote = strokeCount % 2 === 0 ? 'A' : 'D';
            playToneNote(strokeNote, { duration: 0.16, volume: 0.12, type: 'triangle' });
            markChecklistIf(strokeCount >= 8, 'bh-step-1');
            markChecklistIf(strokeCount >= 16, 'bh-step-2');
            markChecklistIf(strokeCount >= 24, 'bh-step-3');
        });

        runToggle?.addEventListener('change', () => {
            if (runToggle.checked) {
                startTimer();
            } else {
                stopTimer();
                runStartedAt = 0;
                paused = false;
                pausedAt = 0;
                setStatus('Paused. Tap Start to resume.');
                if (strokeCount > 0) {
                    finalizeRun();
                }
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseTimer();
            } else {
                resumeTimer();
            }
        });

        updateTimer();
        setStatus('Press Start to begin the timer.');
    },
});

export { updateBowHero as update, bind };
