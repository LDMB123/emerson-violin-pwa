export const createRhythmDashRunControls = ({
    stage,
    runToggle,
    setStatus,
    setRating,
    startMetronome,
    stopMetronome,
    reportSession,
    getWasRunning,
    setWasRunning,
    getPaused,
    setPaused,
    getRealtimeListening,
    ensureRunStartedAt,
    clearForNewRun,
    getTapCount,
    resetIdleState,
    getTargetBpm,
}) => {
    const updateRunningState = () => {
        const running = runToggle?.checked;
        const wasActive = getWasRunning();
        stage.classList.toggle('is-running', Boolean(running));
        if (running) {
            if (getPaused()) {
                setPaused(false);
                setStatus(getRealtimeListening() ? 'Run resumed. Follow the live beat.' : 'Run resumed. Mic off, tap fallback is active.');
            } else {
                setStatus(getRealtimeListening() ? 'Run started. Bow on each beat.' : 'Run started. Tap fallback while listening starts.');
                ensureRunStartedAt();
                clearForNewRun();
                setRating('--', 'off', 0);
            }
            startMetronome();
        } else {
            stopMetronome();
            if (!getPaused() && wasActive && getTapCount() > 0) {
                reportSession();
            }
            if (getPaused()) {
                setStatus('Run paused. Tap Start to resume.');
            } else {
                setStatus(wasActive ? 'Run paused. Tap Start to resume.' : `Tap Start to begin. Target ${getTargetBpm()} BPM.`);
                resetIdleState();
            }
        }
        setWasRunning(Boolean(running));
    };

    const pauseRun = (message) => {
        if (!runToggle?.checked) return;
        setPaused(true);
        runToggle.checked = false;
        updateRunningState();
        if (message) setStatus(message);
    };

    const bindPauseButton = (pauseButton) => {
        pauseButton?.addEventListener('click', () => {
            if (!runToggle) return;
            if (runToggle.checked) {
                pauseRun('Run paused. Tap Start to resume.');
                return;
            }
            if (getPaused()) {
                runToggle.checked = true;
                updateRunningState();
                return;
            }
            setPaused(false);
            runToggle.checked = true;
            updateRunningState();
        });
    };

    return {
        updateRunningState,
        pauseRun,
        bindPauseButton,
    };
};
