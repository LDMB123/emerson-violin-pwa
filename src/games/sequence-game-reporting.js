import { recordGameEvent } from './shared.js';
import { resolveGameObjectiveProgress } from './game-objectives.js';

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
    reportResult({ accuracy, score });
    const objectiveProgress = resolveGameObjectiveProgress({
        stage,
        gameId: id,
        difficultyComplexity: difficulty?.complexity || 0,
        includeInput: (input) => /(-step-|set-)/.test(input.id),
    });
    const sessionMs = Math.max(0, Date.now() - sessionStartedAt);
    recordGameEvent(id, {
        accuracy,
        score,
        difficulty: resolveDifficultyLabel(difficulty?.complexity || 0),
        tier: objectiveProgress.tier,
        sessionMs,
        objectiveTotal: objectiveProgress.objectiveTotal,
        objectivesCompleted: objectiveProgress.objectivesCompleted,
        mistakes: misses,
    });
};
