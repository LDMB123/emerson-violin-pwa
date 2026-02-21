import { clamp } from '../../utils/math.js';
import {
    computeNextCombo,
    computeScoreIncrement,
    computeBeatInterval,
} from '../../utils/rhythm-dash-utils.js';

export const applyRhythmBeatState = ({
    timingScore,
    combo,
    score,
    tapCount,
    mistakes,
    timingScores,
    level,
    targetBpm,
    energy,
}) => {
    const boundedScore = clamp(timingScore, 0, 1);

    const hitEnergyDelta = boundedScore >= 0.45 ? 5 : -15;
    const nextEnergy = clamp(energy + hitEnergyDelta, 0, 100);

    const nextMistakes = boundedScore < 0.45 ? mistakes + 1 : mistakes;
    const nextCombo = nextEnergy > 0 ? computeNextCombo(combo, boundedScore) : 0;
    const increment = nextEnergy > 0 ? computeScoreIncrement(boundedScore, nextCombo) : 0;
    const nextScore = score + increment;
    const nextTapCount = nextEnergy > 0 ? tapCount + 1 : tapCount;
    const nextTimingScores = timingScores.concat(boundedScore).slice(-16);

    let nextLevel = level;
    let nextBpm = targetBpm;

    if (nextEnergy > 0 && nextTapCount > 0 && nextTapCount % 16 === 0) {
        nextLevel += 1;
        nextBpm = 60 + ((nextLevel - 1) * 10);
    }

    return {
        boundedScore,
        combo: nextCombo,
        score: nextScore,
        tapCount: nextTapCount,
        mistakes: nextMistakes,
        timingScores: nextTimingScores,
        energy: nextEnergy,
        level: nextLevel,
        targetBpm: nextBpm,
        beatInterval: computeBeatInterval(nextBpm),
        milestones: {
            l1: nextLevel > 1,
            l2: nextLevel > 2,
            l3: nextLevel > 3,
        },
    };
};
