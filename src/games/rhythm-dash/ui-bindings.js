import { bindTap } from '../shared.js';
import { handleRhythmTapInput } from './helpers.js';

/** Binds Rhythm Dash UI controls to the active gameplay handlers. */
export const bindRhythmDashUiControls = ({
    runToggle,
    tapButton,
    processBeat,
    runtime,
    setStatus,
    suggestedEl,
    settingsButton,
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
