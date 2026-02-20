import {
    applyRhythmDashTargetBpm,
    bindRhythmDashTargetControls,
} from './target-controls.js';

export const createRhythmDashTargetRuntime = ({
    stage,
    targetSlider,
    targetValue,
    setStatus,
    runToggle,
    startMetronome,
    runtime,
}) => {
    const updateTargetBpm = (value, { user = false } = {}) => {
        const nextState = applyRhythmDashTargetBpm({
            value,
            fallbackTargetBpm: runtime.targetBpm,
            stage,
            targetSlider,
            targetValue,
            setStatus,
            runToggle,
            wasRunning: runtime.wasRunning,
            startMetronome,
            user,
        });
        runtime.targetBpm = nextState.targetBpm;
        runtime.beatInterval = nextState.beatInterval;
    };

    const bindTargetControls = ({ settingsReset, getCoachTarget }) => {
        bindRhythmDashTargetControls({
            targetSlider,
            settingsReset,
            applyTargetBpm: updateTargetBpm,
            getCoachTarget,
            setStatus,
        });
    };

    return {
        updateTargetBpm,
        bindTargetControls,
    };
};
