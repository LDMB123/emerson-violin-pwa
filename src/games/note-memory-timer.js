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
    let timerId = null;
    let endTime = null;
    let paused = false;

    const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        endTime = null;
        setGameTimerId(null);
    };

    const pauseTimer = () => {
        if (!timerId) return;
        if (endTime) {
            setTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
        }
        stopTimer();
        paused = true;
    };

    const startTimer = () => {
        if (timerId) return;
        paused = false;
        endTime = Date.now() + getTimeLeft() * 1000;
        timerId = window.setInterval(() => {
            if (!endTime) return;
            const nextTimeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            setTimeLeft(nextTimeLeft);
            if (nextTimeLeft <= 0) {
                setTimeLeft(0);
                setEnded(true);
                clearLock();
                stopTimer();
                finalizeGame();
            }
            updateHud();
        }, 300);
        setGameTimerId(timerId);
    };

    const resumeTimer = () => {
        if (!paused || getEnded()) return;
        if (!isViewActive()) return;
        if (getTimeLeft() <= 0) return;
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
