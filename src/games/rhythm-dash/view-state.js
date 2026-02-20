import { setLiveNumber } from '../shared.js';

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
