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
    setStatus,
    markChecklistIf,
}) => (timingScore, { ratingSource = 'Mic', bpmValue = 0 } = {}) => {
    const runtimeState = getRuntimeState();
    const nextState = applyRhythmBeatState({
        timingScore,
        combo: runtimeState.combo,
        score: runtimeState.score,
        tapCount: runtimeState.tapCount,
        mistakes: runtimeState.mistakes,
        timingScores: runtimeState.timingScores,
        runStartedAt: runtimeState.runStartedAt,
    });
    applyRuntimeState(nextState);
    setLiveScore(nextState.score);
    setLiveCombo(nextState.combo);

    const { rating, level } = getRatingFromScore(nextState.boundedScore);
    setRating(rating, level, nextState.boundedScore);

    syncBpmText(bpmEl, bpmValue);
    setStatus(formatRhythmStatusMessage({ ratingSource, rating, combo: nextState.combo }));

    markChecklistIf(nextState.milestones.tap, 'rd-set-1');
    markChecklistIf(nextState.milestones.combo, 'rd-set-2');
    markChecklistIf(nextState.milestones.endurance, 'rd-set-3');
};
