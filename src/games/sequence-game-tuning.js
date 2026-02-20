import {
    attachTuning,
    setDifficultyBadge,
} from './shared.js';

export const attachSequenceGameTuning = ({
    id,
    stage,
    buildSequence,
    updateTargets,
}) => attachTuning(id, (tuning) => {
    buildSequence();
    setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
    updateTargets();
});
