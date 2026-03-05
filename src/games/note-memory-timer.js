import { createIntervalTicker } from '../utils/interval-ticker.js';

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
    let endTime = null;
    let paused = false;
    let lastRenderedTimeLeft = null;

    const tick = () => {
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
    };
    const ticker = createIntervalTicker({
        onTick: tick,
        intervalMs: TIMER_TICK_MS,
    });

    const stopTimer = () => {
        ticker.stop();
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
        if (!ticker.isRunning()) return;
        if (endTime) {
            publishTimeLeft(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
        }
        stopTimer();
        paused = true;
    };

    const startTimer = () => {
        if (ticker.isRunning()) return;
        paused = false;
        endTime = Date.now() + getTimeLeft() * 1000;
        lastRenderedTimeLeft = null;
        ticker.start();
        setGameTimerId(ticker.getId());
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
        isRunning: ticker.isRunning,
    };
};
