const alwaysTrue = () => true;

/** Wires shared start and stop controls to a game engine lifecycle. */
export const bindGameStartStop = (options = {}) => {
    const startButton = options.startButton ?? null;
    const engine = options.engine ?? null;
    const startLabel = options.startLabel ?? 'Start';
    const stopLabel = options.stopLabel ?? 'Stop';
    const resetBeforeStart = options.resetBeforeStart ?? null;
    const onStop = options.onStop ?? null;
    const isGameViewActive = options.isGameViewActive ?? alwaysTrue;
    const onViewExit = options.onViewExit ?? null;

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
