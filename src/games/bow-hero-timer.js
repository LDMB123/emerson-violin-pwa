const toWholeSeconds = (milliseconds) => Math.max(0, Math.ceil(milliseconds / 1000));

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
    let timerId = null;
    let endTime = null;
    let runStartedAt = 0;
    let paused = false;
    let pausedAt = 0;

    const publishTimerHandle = () => {
        setTimerHandle(timerId);
    };

    const stopTimer = () => {
        if (timerId !== null) {
            clearIntervalFn(timerId);
            timerId = null;
        }
        endTime = null;
        publishTimerHandle();
    };

    const startTimer = () => {
        if (timerId !== null) return;
        paused = false;
        if (remaining <= 0) remaining = timeLimit;
        if (remaining === timeLimit && shouldResetStarsBeforeStart()) {
            resetStars();
        }
        if (!runStartedAt) runStartedAt = now();
        endTime = now() + remaining * 1000;
        timerId = setIntervalFn(() => {
            if (!endTime) return;
            const currentNow = now();
            remaining = toWholeSeconds(endTime - currentNow);
            updateTimer(remaining);
            if (remaining <= 0) {
                stopTimer();
                if (runToggle) runToggle.checked = false;
                setStatus('Time! Tap Start to begin another round.');
                onTimeElapsed();
                return;
            }
            if (runStartedAt && currentNow - runStartedAt >= 30000) {
                onThirtySeconds();
            }
        }, 300);
        publishTimerHandle();
        updateTimer(remaining);
        setStatus('Timer running. Keep bow strokes steady.');
    };

    const pauseTimer = () => {
        if (timerId === null) return;
        if (endTime) {
            remaining = toWholeSeconds(endTime - now());
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
    };
};
