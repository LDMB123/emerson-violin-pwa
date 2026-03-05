import {
    createCountdownLifecycle,
} from '../utils/countdown-lifecycle.js';

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
    let runStartedAt = 0;
    let pausedAt = 0;
    let thirtySecondsMarked = false;
    const countdown = createCountdownLifecycle({
        getRemainingSeconds: () => remaining,
        setRemainingSeconds: (nextRemaining) => {
            remaining = nextRemaining;
        },
        onPublish: updateTimer,
        onTick: (currentNow) => {
            if (!thirtySecondsMarked && runStartedAt && currentNow - runStartedAt >= 30000) {
                thirtySecondsMarked = true;
                onThirtySeconds();
            }
        },
        onElapsed: () => {
            if (runToggle) runToggle.checked = false;
            setStatus('Time! Tap Start to begin another round.');
            onTimeElapsed();
        },
        onStart: () => {
            setStatus('Timer running. Keep bow strokes steady.');
        },
        onPause: () => {
            pausedAt = now();
            setStatus('Paused while app is in the background.');
        },
        canResume,
        now,
        setTimerHandle,
        setIntervalFn,
        clearIntervalFn,
    });
    const isRunning = () => countdown.isRunning();
    const stopTimer = () => {
        countdown.stop();
    };

    const startTimer = () => {
        if (isRunning()) return;
        if (remaining <= 0) remaining = timeLimit;
        const startingFreshRun = remaining === timeLimit;
        if (startingFreshRun) {
            thirtySecondsMarked = false;
        }
        if (startingFreshRun && shouldResetStarsBeforeStart()) {
            resetStars();
        }
        if (!runStartedAt) runStartedAt = now();
        countdown.start({ resetPublished: startingFreshRun });
    };

    const pauseTimer = () => {
        if (!isRunning()) return;
        countdown.pause();
    };

    const resumeTimer = () => {
        countdown.resume({
            beforeStart: () => {
                const currentNow = now();
                if (pausedAt && runStartedAt) {
                    runStartedAt += currentNow - pausedAt;
                }
                pausedAt = 0;
            },
        });
    };

    const resetPauseState = () => {
        runStartedAt = 0;
        pausedAt = 0;
        thirtySecondsMarked = false;
        countdown.clearPaused();
        countdown.resetPublished();
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
