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

export const reportSequenceSession = ({
    id,
    score,
    combo,
    comboTarget,
    reportResult,
    stage,
    difficulty,
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
