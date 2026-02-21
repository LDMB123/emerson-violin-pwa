import { getRatingFromScore } from '../../utils/rhythm-dash-utils.js';
import { applyRhythmBeatState } from './beat-state.js';
import {
    syncBpmText,
    formatRhythmStatusMessage,
} from './helpers.js';

export const createRhythmDashBeatProcessor = ({
    getRuntimeState,
    applyRuntimeState,
    setLiveScore,
    setLiveCombo,
    setRating,
    bpmEl,
    energyBar,
    levelDisplay,
    setStatus,
    markChecklistIf,
    pauseRun,
}) => (timingScore, { ratingSource = 'Mic', bpmValue = 0 } = {}) => {
    const runtimeState = getRuntimeState();
    if (runtimeState.energy <= 0) return;

    const nextState = applyRhythmBeatState({
        timingScore,
        combo: runtimeState.combo,
        score: runtimeState.score,
        tapCount: runtimeState.tapCount,
        mistakes: runtimeState.mistakes,
        timingScores: runtimeState.timingScores,
        runStartedAt: runtimeState.runStartedAt,
        level: runtimeState.level,
        targetBpm: runtimeState.targetBpm,
        energy: runtimeState.energy,
    });

    applyRuntimeState(nextState);
    setLiveScore(nextState.score);
    setLiveCombo(nextState.combo);

    if (energyBar) energyBar.style.width = `${nextState.energy}%`;
    if (levelDisplay) levelDisplay.textContent = `Level ${nextState.level}`;

    const { rating, level } = getRatingFromScore(nextState.boundedScore);
    setRating(rating, level, nextState.boundedScore);

    syncBpmText(bpmEl, bpmValue > 0 ? bpmValue : nextState.targetBpm);

    if (nextState.energy <= 0) {
        setStatus('Energy depleted! Tap Start Run to try again.');
        if (energyBar) energyBar.style.backgroundColor = 'var(--color-error)';
        pauseRun();
    } else {
        if (energyBar) energyBar.style.backgroundColor = '';
        setStatus(formatRhythmStatusMessage({ ratingSource, rating, combo: nextState.combo }));
    }

    markChecklistIf(nextState.milestones.l1, 'rd-set-1');
    markChecklistIf(nextState.milestones.l2, 'rd-set-2');
    markChecklistIf(nextState.milestones.l3, 'rd-set-3');
};
