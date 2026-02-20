import { clamp } from '../../utils/math.js';
import {
    computeNextCombo,
    computeScoreIncrement,
    shouldMarkTapMilestone,
    shouldMarkComboMilestone,
    shouldMarkEnduranceMilestone,
} from '../../utils/rhythm-dash-utils.js';

export const applyRhythmBeatState = ({
    timingScore,
    combo,
    score,
    tapCount,
    mistakes,
    timingScores,
    runStartedAt,
}) => {
    const boundedScore = clamp(timingScore, 0, 1);
    const nextMistakes = boundedScore < 0.45 ? mistakes + 1 : mistakes;
    const nextCombo = computeNextCombo(combo, boundedScore);
    const increment = computeScoreIncrement(boundedScore, nextCombo);
    const nextScore = score + increment;
    const nextTapCount = tapCount + 1;
    const nextTimingScores = timingScores.concat(boundedScore).slice(-16);
    const elapsed = runStartedAt ? (Date.now() - runStartedAt) : 0;

    return {
        boundedScore,
        combo: nextCombo,
        score: nextScore,
        tapCount: nextTapCount,
        mistakes: nextMistakes,
        timingScores: nextTimingScores,
        milestones: {
            tap: shouldMarkTapMilestone(nextTapCount),
            combo: shouldMarkComboMilestone(nextCombo),
            endurance: shouldMarkEnduranceMilestone(nextTapCount, elapsed),
        },
    };
};
