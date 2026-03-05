import { reportFilteredSessionGameEvent } from '../game-session-reporting.js';
import {
    computeAccuracyFromTimingScores,
    computeAccuracyFromBpmHistory,
} from '../../utils/rhythm-dash-utils.js';
import {
    resolveDifficultyLevel,
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
    const difficultyLevel = resolveDifficultyLevel(difficulty);
    reportFilteredSessionGameEvent({
        id: 'rhythm-dash',
        reportResult: tuningReport,
        stage,
        difficulty,
        accuracy,
        score,
        sessionStartedAt: runStartedAt,
        includeInput: (input) => input.id.startsWith('rd-set-'),
        difficultyLabel: difficultyLevel,
        mistakes,
    });

    return { reported: true, accuracy };
};
