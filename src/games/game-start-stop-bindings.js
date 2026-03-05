export const bindGameStartStop = ({
    startButton = null,
    engine = null,
    startLabel = 'Start',
    stopLabel = 'Stop',
    resetBeforeStart = null,
    onStop = null,
    isGameViewActive = () => true,
    onViewExit = null,
} = {}) => {
    const applyStartLabel = () => {
        if (startButton) startButton.textContent = startLabel;
    };

    const applyStopLabel = () => {
        if (startButton) startButton.textContent = stopLabel;
    };

    const stopGame = () => {
        if (engine?.isRunning) {
            engine.stop();
        }
        if (typeof onStop === 'function') {
            onStop();
        }
        applyStartLabel();
    };

    const handleClick = () => {
        if (engine?.isRunning) {
            stopGame();
            return;
        }

        if (typeof resetBeforeStart === 'function') {
            resetBeforeStart();
        }
        engine?.start?.();
        applyStopLabel();
    };

    const handleHashChange = () => {
        if (isGameViewActive()) return;
        stopGame();
        window.removeEventListener('hashchange', handleHashChange);
        if (typeof onViewExit === 'function') {
            onViewExit();
        }
    };

    startButton?.addEventListener('click', handleClick);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
        startButton?.removeEventListener('click', handleClick);
        window.removeEventListener('hashchange', handleHashChange);
    };
};
