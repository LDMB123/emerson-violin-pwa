import { createCountdownLifecycle } from '../utils/countdown-lifecycle.js';

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
    const countdown = createCountdownLifecycle({
        getRemainingSeconds: getTimeLeft,
        setRemainingSeconds: setTimeLeft,
        onPublish: () => {
            updateHud();
        },
        onElapsed: () => {
            setEnded(true);
            clearLock();
            finalizeGame();
        },
        canResume: () => !getEnded()
            && isViewActive()
            && getTimeLeft() > 0,
        setTimerHandle: setGameTimerId,
    });
    const stopTimer = () => {
        countdown.stop();
    };

    const pauseTimer = () => {
        countdown.pause();
    };

    const startTimer = () => {
        countdown.start({ resetPublished: true });
    };

    const resumeTimer = () => {
        countdown.resume({ resetPublished: true });
    };

    return {
        stopTimer,
        pauseTimer,
        startTimer,
        resumeTimer,
        isRunning: countdown.isRunning,
    };
};
