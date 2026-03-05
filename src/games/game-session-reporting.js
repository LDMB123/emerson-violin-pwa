import { positiveRound } from '../utils/math.js';
import { resolveSessionObjectiveProgress } from './game-objectives.js';
import { recordGameEvent } from './shared.js';

export const buildSessionGameEventPayload = ({
    stage = null,
    gameId = '',
    difficulty = null,
    includeInput = null,
    accuracy = 0,
    score = 0,
    sessionStartedAt = 0,
    difficultyLabel = '',
    resolveDifficultyLabel = null,
    mistakes = null,
} = {}) => {
    const objectiveProgress = resolveSessionObjectiveProgress({
        stage,
        gameId,
        difficulty,
        includeInput,
    });
    const sessionMs = Math.max(0, Date.now() - (sessionStartedAt || Date.now()));
    const resolvedDifficulty = difficultyLabel
        || (typeof resolveDifficultyLabel === 'function'
            ? resolveDifficultyLabel({ stage, difficulty })
            : '')
        || stage?.querySelector?.('.difficulty-badge')?.dataset?.level
        || stage?.dataset?.gameDifficulty
        || 'medium';
    const resolvedMistakes = Number.isFinite(mistakes)
        ? positiveRound(mistakes)
        : Math.max(0, objectiveProgress.objectiveTotal - objectiveProgress.objectivesCompleted);

    return {
        accuracy,
        score,
        difficulty: resolvedDifficulty,
        tier: objectiveProgress.tier,
        sessionMs,
        objectiveTotal: objectiveProgress.objectiveTotal,
        objectivesCompleted: objectiveProgress.objectivesCompleted,
        mistakes: resolvedMistakes,
    };
};

export const buildSessionReportEventArgs = ({
    id = '',
    reportResult = null,
    stage = null,
    difficulty = null,
    accuracy = 0,
    score = 0,
    sessionStartedAt = 0,
} = {}) => ({
    id,
    reportResult,
    stage,
    gameId: id,
    difficulty,
    accuracy,
    score,
    sessionStartedAt,
});

export const isStepSetObjectiveInput = (input) => /(-step-|set-)/.test(input.id);

export const isPrimarySessionObjectiveInput = (input) => (
    !input.id.startsWith('setting-')
    && !input.id.includes('parent-')
    && isStepSetObjectiveInput(input)
);

export const reportSessionGameEvent = ({
    id = '',
    reportResult = null,
    accuracy = 0,
    score = 0,
    ...payloadOptions
} = {}) => {
    if (!id) return null;
    if (typeof reportResult === 'function') {
        reportResult({ accuracy, score });
    }
    const payload = buildSessionGameEventPayload({
        ...payloadOptions,
        accuracy,
        score,
    });
    recordGameEvent(id, payload);
    return payload;
};

export const reportFilteredSessionGameEvent = (options = {}) => {
    const {
        includeInput = null,
        mistakes = null,
        difficultyLabel = '',
    } = options;
    return reportSessionGameEvent({
        ...buildSessionReportEventArgs(options),
        includeInput,
        mistakes,
        difficultyLabel,
    });
};
