import { updateScoreCombo } from './shared.js';
import { updateSequenceTargets } from './sequence-game-targets.js';

export const createSequenceGameViewRuntime = ({
    stage,
    prefix,
    statusKey,
    buttonClass,
    targetDataAttr,
    comboTarget,
    getSequence,
    getSeqIndex,
    getScore,
    getCombo,
}) => {
    const scoreEl = stage.querySelector(`[data-${prefix}="score"]`);
    const comboEl = stage.querySelector(`[data-${prefix}="combo"]`);
    const statusEl = stage.querySelector(`[data-${prefix}="${statusKey}"]`);
    const sequenceEl = stage.querySelector(`[data-${prefix}="sequence"]`);
    const buttons = Array.from(stage.querySelectorAll(buttonClass));
    const targets = Array.from(stage.querySelectorAll(`[data-${prefix}-target]`));

    const updateTargets = (message) => {
        updateSequenceTargets({
            targets,
            targetDataAttr,
            sequence: getSequence(),
            seqIndex: getSeqIndex(),
            comboTarget,
            statusEl,
            message,
            sequenceEl,
        });
    };

    const updateScoreboard = (scoreValue = getScore(), comboValue = getCombo()) => (
        updateScoreCombo(scoreEl, comboEl, scoreValue, comboValue)
    );

    return {
        scoreEl,
        comboEl,
        buttons,
        updateTargets,
        updateScoreboard,
    };
};
