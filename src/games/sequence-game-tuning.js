import {
    attachTuning,
    setDifficultyBadge,
} from './shared.js';

/** Attaches adaptive tuning updates to a Sequence Game stage. */
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
