import {
    isStepSetObjectiveInput,
    reportFilteredSessionGameEvent,
} from './game-session-reporting.js';

const resolveDifficultyLabel = (complexity = 0) => (
    complexity >= 2 ? 'hard' : complexity >= 1 ? 'medium' : 'easy'
);

const computeAccuracy = ({ combo, comboTarget }) => (
    comboTarget ? Math.min(1, combo / comboTarget) * 100 : 0
);

/** Reports the completed Sequence Game session once. */
export const reportSequenceSession = ({
    reportResult,
    comboTarget,
    combo,
    score,
    difficulty,
    stage,
    id,
    sessionStartedAt,
    misses,
}) => {
    if (score <= 0) return;

    const accuracy = computeAccuracy({ combo, comboTarget });
    reportFilteredSessionGameEvent({
        id,
        reportResult,
        stage,
        difficulty,
        accuracy,
        score,
        sessionStartedAt,
        includeInput: isStepSetObjectiveInput,
        difficultyLabel: resolveDifficultyLabel(difficulty?.complexity || 0),
        mistakes: misses,
    });
};
