import { bindTap } from '../shared.js';
import { handleRhythmTapInput } from './helpers.js';

export const bindRhythmDashUiControls = ({
    runToggle,
    settingsButton,
    setStatus,
    tapButton,
    runtime,
    suggestedEl,
    processBeat,
}) => {
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
