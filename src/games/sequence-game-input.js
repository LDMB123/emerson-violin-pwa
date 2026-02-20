import { applySequenceTap } from './sequence-game-logic.js';

export const handleSequenceGameTap = ({
    note,
    noteOptions,
    playToneNote,
    sequence,
    seqIndex,
    combo,
    score,
    misses,
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
}) => {
    if (note) {
        playToneNote(note, noteOptions);
    }
    const targetNote = sequence[seqIndex];
    const nextTapState = applySequenceTap({
        note,
        targetNote,
        sequenceLength: sequence.length,
        seqIndex,
        combo,
        score,
        misses,
        baseScore,
        comboMult,
        missPenalty,
    });

    let nextSequence = sequence;
    let nextSeqIndex = nextTapState.seqIndex;
    if (nextTapState.isCorrect) {
        if (onCorrectHit) onCorrectHit(note, callbackState);

        if (nextTapState.completedSequence) {
            const completedSequence = sequence.slice();
            markChecklist(completionChecklistId);
            reportSession();
            const rebuiltState = buildSequence();
            nextSequence = rebuiltState.sequence;
            nextSeqIndex = rebuiltState.seqIndex;
            playToneSequence(completedSequence, seqOptions);
        }
        updateTargets();
    } else {
        updateTargets(`Missed. Aim for ${targetNote} next.`);
    }
    updateScoreboard(nextTapState.score, nextTapState.combo);
    markChecklistIf(nextTapState.combo >= comboTarget, comboChecklistId);

    return {
        sequence: nextSequence,
        seqIndex: nextSeqIndex,
        combo: nextTapState.combo,
        score: nextTapState.score,
        misses: nextTapState.misses,
    };
};
