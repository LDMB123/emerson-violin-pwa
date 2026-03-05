import { createIntervalTicker } from '../utils/interval-ticker.js';
import {
    COUNTDOWN_TICK_MS,
    toRemainingCountdownSeconds,
} from '../utils/countdown-utils.js';

export const createBowHeroTimerLifecycle = ({
    timeLimit,
    runToggle,
    shouldResetStarsBeforeStart,
    resetStars,
    updateTimer,
    setStatus,
    onThirtySeconds,
    onTimeElapsed,
    setTimerHandle,
    canResume,
    now,
    setIntervalFn,
    clearIntervalFn,
}) => {
    let remaining = timeLimit;
    let endTime = null;
    let runStartedAt = 0;
    let paused = false;
    let pausedAt = 0;
    let thirtySecondsMarked = false;
    let lastRenderedSecond = null;

    const tick = () => {
        if (!endTime) return;
        const currentNow = now();
        remaining = toRemainingCountdownSeconds(endTime, currentNow);
        publishRemaining(remaining);
        if (remaining <= 0) {
            stopTimer();
            if (runToggle) runToggle.checked = false;
            setStatus('Time! Tap Start to begin another round.');
            onTimeElapsed();
            return;
        }
        if (!thirtySecondsMarked && runStartedAt && currentNow - runStartedAt >= 30000) {
            thirtySecondsMarked = true;
            onThirtySeconds();
        }
    };
    const ticker = createIntervalTicker({
        onTick: tick,
        intervalMs: COUNTDOWN_TICK_MS,
        setIntervalFn,
        clearIntervalFn,
    });

    const publishTimerHandle = () => {
        if (!setTimerHandle) return;
        setTimerHandle(ticker.getId());
    };

    const isRunning = () => ticker.isRunning();

    const stopTimer = () => {
        ticker.stop();
        endTime = null;
        publishTimerHandle();
    };

    const publishRemaining = (nextRemaining) => {
        if (nextRemaining === lastRenderedSecond) return;
        lastRenderedSecond = nextRemaining;
        updateTimer(nextRemaining);
    };

    const startTimer = () => {
        if (isRunning()) return;
        paused = false;
        if (remaining <= 0) remaining = timeLimit;
        if (remaining === timeLimit) {
            thirtySecondsMarked = false;
            lastRenderedSecond = null;
        }
        if (remaining === timeLimit && shouldResetStarsBeforeStart()) {
            resetStars();
        }
        if (!runStartedAt) runStartedAt = now();
        endTime = now() + remaining * 1000;
        ticker.start();
        publishTimerHandle();
        publishRemaining(remaining);
        setStatus('Timer running. Keep bow strokes steady.');
    };

    const pauseTimer = () => {
        if (!isRunning()) return;
        if (endTime) {
            remaining = toRemainingCountdownSeconds(endTime, now());
        }
        stopTimer();
        paused = true;
        pausedAt = now();
        setStatus('Paused while app is in the background.');
    };

    const resumeTimer = () => {
        if (!paused) return;
        if (!canResume()) return;
        if (remaining <= 0) return;
        const currentNow = now();
        if (pausedAt && runStartedAt) {
            runStartedAt += currentNow - pausedAt;
        }
        paused = false;
        pausedAt = 0;
        startTimer();
    };

    const resetPauseState = () => {
        runStartedAt = 0;
        paused = false;
        pausedAt = 0;
        thirtySecondsMarked = false;
        lastRenderedSecond = null;
    };

    const renderTimer = () => {
        updateTimer(remaining);
    };

    return {
        startTimer,
        stopTimer,
        pauseTimer,
        resumeTimer,
        resetPauseState,
        renderTimer,
        isRunning,
    };
};
