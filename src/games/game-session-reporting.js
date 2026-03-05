import { positiveRound } from '../utils/math.js';
import { resolveSessionObjectiveProgress } from './game-objectives.js';
import { recordGameEvent } from './shared.js';

const DEFAULT_SESSION_REPORT_OPTIONS = {
    stage: null,
    difficulty: null,
    accuracy: 0,
    score: 0,
    sessionStartedAt: 0,
};

const buildSessionGameEventPayload = ({
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

const buildSessionReportEventArgs = (options = {}) => {
    const normalizedOptions = {
        ...DEFAULT_SESSION_REPORT_OPTIONS,
        ...options,
    };
    const {
        id = '',
        reportResult = null,
        stage,
        difficulty,
        accuracy,
        score,
        sessionStartedAt,
    } = normalizedOptions;

    return {
        id,
        reportResult,
        stage,
        gameId: id,
        difficulty,
        accuracy,
        score,
        sessionStartedAt,
    };
};

/** Returns whether an input id represents a step/set objective checkbox. */
export const isStepSetObjectiveInput = (input) => /(-step-|set-)/.test(input.id);

/** Returns whether an input should contribute to primary session objective reporting. */
export const isPrimarySessionObjectiveInput = (input) => (
    !input.id.startsWith('setting-')
    && !input.id.includes('parent-')
    && isStepSetObjectiveInput(input)
);

const reportSessionGameEvent = ({
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

/** Records a game session event using filtered objective inputs and derived payload data. */
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
