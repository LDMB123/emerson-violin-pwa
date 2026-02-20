import { bindTap } from '../shared.js';
import { handleRhythmTapInput } from './helpers.js';

export const bindRhythmDashUiControls = ({
    runToggle,
    updateRunningState,
    targetSlider,
    updateTargetBpm,
    bindTargetControls,
    settingsReset,
    getCoachTarget,
    bindPauseButton,
    pauseButton,
    settingsButton,
    setStatus,
    tapButton,
    runtime,
    suggestedEl,
    processBeat,
}) => {
    runToggle?.addEventListener('change', updateRunningState);
    updateRunningState();
    if (targetSlider) {
        updateTargetBpm(targetSlider.value);
    }

    bindTargetControls({
        settingsReset,
        getCoachTarget,
    });

    bindPauseButton(pauseButton);

    settingsButton?.addEventListener('click', () => {
        setStatus('Tip: keep bows even and steady for cleaner rhythm.');
    });

    bindTap(tapButton, () => {
        runtime.lastTap = handleRhythmTapInput({
            runToggle,
            setStatus,
            lastTap: runtime.lastTap,
            beatInterval: runtime.beatInterval,
            tapHistory: runtime.tapHistory,
            suggestedEl,
            processBeat,
        });
    });
};
