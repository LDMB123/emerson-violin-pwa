import { setLiveNumber } from '../shared.js';

/** Creates DOM update helpers for the Rhythm Dash HUD. */
export const createRhythmDashViewState = ({
    scoreEl,
    comboEl,
    bpmEl,
}) => ({
    setLiveScore: (value) => {
        setLiveNumber(scoreEl, 'liveScore', value);
    },
    setLiveCombo: (value) => {
        setLiveNumber(comboEl, 'liveCombo', value, (comboValue) => `x${comboValue}`);
    },
    clearBpm: () => {
        if (bpmEl) bpmEl.textContent = '--';
    },
});
