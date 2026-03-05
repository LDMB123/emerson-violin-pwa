import { readLiveNumber } from './shared.js';

/** Updates the Sequence Game summary and live counters. */
export const updateSequenceSummary = ({
    viewId,
    stepPrefix,
    stepScore,
    scoreEl,
    comboEl,
}) => {
    const inputs = Array.from(
        document.querySelectorAll(`${viewId} input[id^="${stepPrefix}-step-"]`),
    );
    if (!inputs.length) return;

    const checked = inputs.filter((input) => input.checked).length;
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');

    if (scoreEl) {
        const fallbackScore = checked * stepScore + (checked === inputs.length ? stepScore : 0);
        scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : fallbackScore);
    }
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};
