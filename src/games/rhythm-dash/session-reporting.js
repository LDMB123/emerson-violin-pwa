import { recordGameEvent } from '../shared.js';
import {
    computeAccuracyFromTimingScores,
    computeAccuracyFromBpmHistory,
} from '../../utils/rhythm-dash-utils.js';
import {
    resolveDifficultyLevel,
    getObjectiveSummary,
} from './helpers.js';

const computeRhythmAccuracy = ({
    timingScores,
    tapHistory,
    targetBpm,
}) => {
    if (timingScores.length) {
        return computeAccuracyFromTimingScores(timingScores);
    }
    return computeAccuracyFromBpmHistory(tapHistory, targetBpm);
};

export const reportRhythmDashSession = ({
    reported,
    tapCount,
    timingScores,
    tapHistory,
    targetBpm,
    score,
    tuningReport,
    stage,
    difficulty,
    runStartedAt,
    mistakes,
}) => {
    if (reported || tapCount === 0) {
        return { reported };
    }

    const accuracy = computeRhythmAccuracy({
        timingScores,
        tapHistory,
        targetBpm,
    });
    tuningReport?.({ score, accuracy });

    const {
        objectiveTier,
        objectiveTotal,
        objectivesCompleted,
    } = getObjectiveSummary(stage, difficulty);
    const difficultyLevel = resolveDifficultyLevel(difficulty);
    const sessionMs = runStartedAt ? Math.max(0, Date.now() - runStartedAt) : 0;
    recordGameEvent('rhythm-dash', {
        accuracy,
        score,
        difficulty: difficultyLevel,
        tier: objectiveTier,
        sessionMs,
        objectiveTotal,
        objectivesCompleted,
        mistakes,
    });

    return { reported: true, accuracy };
};
