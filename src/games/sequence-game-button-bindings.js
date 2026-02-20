import { bindTap } from './shared.js';
import { handleSequenceGameTap } from './sequence-game-input.js';

export const bindSequenceGameButtons = ({
    buttons,
    btnDataAttr,
    noteOptions,
    playToneNote,
    getRuntimeState,
    baseScore,
    comboMult,
    missPenalty,
    onCorrectHit,
    callbackState,
    completionChecklistId,
    comboChecklistId,
    comboTarget,
    markChecklist,
    markChecklistIf,
    reportSession,
    buildSequence,
    playToneSequence,
    seqOptions,
    updateTargets,
    updateScoreboard,
    applyTapResult,
}) => {
    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset[btnDataAttr];
            const runtimeState = getRuntimeState();
            const nextState = handleSequenceGameTap({
                note,
                noteOptions,
                playToneNote,
                sequence: runtimeState.sequence,
                seqIndex: runtimeState.seqIndex,
                combo: runtimeState.combo,
                score: runtimeState.score,
                misses: runtimeState.misses,
                baseScore,
                comboMult,
                missPenalty,
                onCorrectHit,
                callbackState,
                completionChecklistId,
                comboChecklistId,
                comboTarget,
                markChecklist,
                markChecklistIf,
                reportSession,
                buildSequence,
                playToneSequence,
                seqOptions,
                updateTargets,
                updateScoreboard,
            });
            applyTapResult(nextState);
        });
    });
};
