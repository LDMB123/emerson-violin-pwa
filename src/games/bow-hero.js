import { createGame } from './game-shell.js';
import { bindVisibilityLifecycle } from './game-interactive-runtime.js';
import {
    cachedEl,
    formatCountdown,
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    markChecklistIf,
    bindTap,
    playToneNote,
    stopTonePlayer,
} from './shared.js';
import {
    computeBowStrokeFeedback,
    resolveBowStrokeNote,
} from './bow-hero-stroke.js';
import {
    renderBowHeroStars,
    handleBowHeroRunToggleChange,
} from './bow-hero-state.js';
import { createBowHeroTimerLifecycle } from './bow-hero-timer.js';

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
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
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

        const updateTimer = (remaining) => {
            if (timerEl) timerEl.textContent = formatCountdown(remaining);
        };

        const resetStars = () => {
            starCount = 0;
            strokeCount = 0;
            gameState.starCount = 0;
            gameState.strokeCount = 0;
            renderBowHeroStars({ stars, starCount });
            setLiveNumber(starsEl, 'liveStars', starCount);
        };

        const finalizeRun = () => {
            gameState.starCount = starCount;
            gameState.strokeCount = strokeCount;
            gameState.score = starCount * 20 + strokeCount * 2;
            reportSession();
        };

        const timerLifecycle = createBowHeroTimerLifecycle({
            timeLimit,
            runToggle,
            shouldResetStarsBeforeStart: () => starCount > 0,
            resetStars,
            updateTimer,
            setStatus,
            onThirtySeconds: () => {
                markChecklist('bh-step-4');
            },
            onTimeElapsed: () => {
                markChecklist('bh-step-5');
                finalizeRun();
            },
            setTimerHandle: (timerId) => {
                gameState._timerId = timerId;
            },
            canResume: () => Boolean(runToggle?.checked)
                && window.location.hash === '#view-game-bow-hero',
            now: () => Date.now(),
            setIntervalFn: (callback, delay) => window.setInterval(callback, delay),
            clearIntervalFn: (timerId) => window.clearInterval(timerId),
        });

        gameState._onDeactivate = () => {
            timerLifecycle.pauseTimer();
            stopTonePlayer();
        };

        bindTap(strokeButton, () => {
            starCount = Math.min(stars.length, starCount + 1);
            strokeCount += 1;
            renderBowHeroStars({ stars, starCount });
            setLiveNumber(starsEl, 'liveStars', starCount);
            const now = performance.now();
            const strokeFeedback = computeBowStrokeFeedback({
                lastStrokeAt,
                now,
                targetTempo,
                smoothStreak,
            });
            smoothStreak = strokeFeedback.smoothStreak;
            setStatus(strokeFeedback.statusMessage);
            lastStrokeAt = now;
            const strokeNote = resolveBowStrokeNote(strokeCount);
            playToneNote(strokeNote, { duration: 0.16, volume: 0.12, type: 'triangle' });
            markChecklistIf(strokeCount >= 8, 'bh-step-1');
            markChecklistIf(strokeCount >= 16, 'bh-step-2');
            markChecklistIf(strokeCount >= 24, 'bh-step-3');
        });

        runToggle?.addEventListener('change', () => {
            handleBowHeroRunToggleChange({
                runToggle,
                startTimer: timerLifecycle.startTimer,
                stopTimer: timerLifecycle.stopTimer,
                resetPauseState: timerLifecycle.resetPauseState,
                setStatus,
                strokeCount,
                finalizeRun,
            });
        });

        bindVisibilityLifecycle({
            onHidden: timerLifecycle.pauseTimer,
            onVisible: timerLifecycle.resumeTimer,
            registerCleanup,
        });

        timerLifecycle.renderTimer();
        setStatus('Press Start to begin the timer.');
    },
});

export { updateBowHero as update, bind };
