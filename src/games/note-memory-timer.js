import { createIntervalTicker } from '../utils/interval-ticker.js';
import {
    COUNTDOWN_TICK_MS,
    toRemainingCountdownSeconds,
} from '../utils/countdown-utils.js';

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
    let endTime = null;
    let paused = false;
    let lastRenderedTimeLeft = null;

    const getRemainingTimeLeft = () => toRemainingCountdownSeconds(endTime, Date.now());

    const tick = () => {
        if (!endTime) return;
        const nextTimeLeft = getRemainingTimeLeft();
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
        intervalMs: COUNTDOWN_TICK_MS,
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
            publishTimeLeft(getRemainingTimeLeft());
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
