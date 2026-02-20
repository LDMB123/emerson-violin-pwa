import { createRhythmDashRunControls } from './run-controls.js';
import { resetRhythmDashRun } from './reset-run.js';
import {
    resetRhythmDashIdleState,
    resetRhythmDashRunState,
} from './runtime-state.js';

export const createRhythmDashControlRuntime = ({
    stage,
    runToggle,
    setStatus,
    setRating,
    startMetronome,
    stopMetronome,
    reportSession,
    runtime,
    setLiveScore,
    setLiveCombo,
    clearBpm,
    meterTrack,
}) => {
    const runControls = createRhythmDashRunControls({
        stage,
        runToggle,
        setStatus,
        setRating,
        startMetronome,
        stopMetronome,
        reportSession,
        getWasRunning: () => runtime.wasRunning,
        setWasRunning: (value) => {
            runtime.wasRunning = value;
        },
        getPaused: () => runtime.paused,
        setPaused: (value) => {
            runtime.paused = value;
        },
        getRealtimeListening: () => runtime.realtimeListening,
        ensureRunStartedAt: () => {
            if (!runtime.runStartedAt) runtime.runStartedAt = Date.now();
        },
        clearForNewRun: () => {
            runtime.reported = false;
            runtime.timingScores = [];
        },
        getTapCount: () => runtime.tapCount,
        resetIdleState: () => {
            resetRhythmDashIdleState(runtime);
        },
        getTargetBpm: () => runtime.targetBpm,
    });

    const { updateRunningState, pauseRun, bindPauseButton } = runControls;

    const resetRun = () => {
        resetRhythmDashRun({
            stopMetronome,
            runToggle,
            setWasRunning: (value) => {
                runtime.wasRunning = value;
            },
            resetRuntimeState: () => resetRhythmDashRunState(runtime),
            setLiveScore,
            setLiveCombo,
            clearBpm,
            setRating,
            meterTrack,
            updateRunningState,
        });
    };

    return {
        updateRunningState,
        pauseRun,
        bindPauseButton,
        resetRun,
    };
};
