export const createNoteMemoryTimer = ({
    getTimeLeft,
    setTimeLeft,
    getEnded,
    setEnded,
    clearLock,
    updateHud,
    finalizeGame,
    setGameTimerId,
    isViewActive,
}) => {
    const TIMER_TICK_MS = 500;
    let timerId = null;
    let endTime = null;
    let paused = false;
    let lastRenderedTimeLeft = null;

    const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        endTime = null;
        setGameTimerId(null);
    };

    const publishTimeLeft = (nextTimeLeft) => {
        if (nextTimeLeft === lastRenderedTimeLeft) return;
        lastRenderedTimeLeft = nextTimeLeft;
        setTimeLeft(nextTimeLeft);
        updateHud();
    };

    const pauseTimer = () => {
        if (!timerId) return;
        if (endTime) {
            publishTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
        }
        stopTimer();
        paused = true;
    };

    const startTimer = () => {
        if (timerId) return;
        paused = false;
        endTime = Date.now() + getTimeLeft() * 1000;
        lastRenderedTimeLeft = null;
        timerId = window.setInterval(() => {
            if (!endTime) return;
            const nextTimeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            if (nextTimeLeft <= 0) {
                publishTimeLeft(0);
                setEnded(true);
                clearLock();
                stopTimer();
                finalizeGame();
                return;
            }
            publishTimeLeft(nextTimeLeft);
        }, TIMER_TICK_MS);
        setGameTimerId(timerId);
        publishTimeLeft(getTimeLeft());
    };

    const resumeTimer = () => {
        const canResumeTimer = paused
            && !getEnded()
            && isViewActive()
            && getTimeLeft() > 0;
        if (!canResumeTimer) return;
        paused = false;
        startTimer();
    };

    return {
        stopTimer,
        pauseTimer,
        startTimer,
        resumeTimer,
        isRunning: () => Boolean(timerId),
    };
};
