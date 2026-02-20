import { GAME_META } from './game-config.js';

const objectiveTierFromComplexity = (complexity) => {
    if (complexity >= 2) return 'mastery';
    if (complexity >= 1) return 'core';
    return 'foundation';
};

const collectChecklistInputs = (stage, includeInput) => {
    if (!stage) return [];
    const inputs = Array.from(stage.querySelectorAll('input[type="checkbox"][id]'));
    if (typeof includeInput !== 'function') return inputs;
    return inputs.filter((input) => includeInput(input));
};

export const resolveGameObjectiveProgress = ({
    stage,
    gameId,
    difficultyComplexity = 0,
    includeInput = null,
} = {}) => {
    const tier = stage?.dataset?.gameObjectiveTier
        || objectiveTierFromComplexity(Number(difficultyComplexity || 0));
    const objectivePack = GAME_META?.[gameId]?.objectivePacks?.[tier] || [];
    const checklistInputs = collectChecklistInputs(stage, includeInput);
    const objectiveTotal = objectivePack.length || checklistInputs.length || 1;
    const objectivesCompleted = Math.min(
        objectiveTotal,
        checklistInputs.filter((input) => input.checked).length,
    );

    return {
        tier,
        objectiveTotal,
        objectivesCompleted,
    };
};
