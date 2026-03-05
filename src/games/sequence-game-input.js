import { applySequenceTap } from './sequence-game-logic.js';

/** Handles a Sequence Game note tap against the active sequence. */
export const handleSequenceGameTap = ({
    note,
    sequence,
    seqIndex,
    combo,
    score,
    misses,
    tapContext,
}) => {
    if (note) {
        tapContext.playToneNote(note, tapContext.noteOptions);
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
        baseScore: tapContext.baseScore,
        comboMult: tapContext.comboMult,
        missPenalty: tapContext.missPenalty,
    });

    let nextSequence = sequence;
    let nextSeqIndex = nextTapState.seqIndex;
    if (nextTapState.isCorrect) {
        if (tapContext.onCorrectHit) {
            tapContext.onCorrectHit(note, tapContext.callbackState);
        }

        if (nextTapState.completedSequence) {
            const completedSequence = sequence.slice();
            tapContext.markChecklist(tapContext.completionChecklistId);
            tapContext.reportSession();
            const rebuiltState = tapContext.buildSequence();
            nextSequence = rebuiltState.sequence;
            nextSeqIndex = rebuiltState.seqIndex;
            tapContext.playToneSequence(completedSequence, tapContext.seqOptions);
        }
        tapContext.updateTargets();
    } else {
        tapContext.updateTargets(`Missed. Aim for ${targetNote} next.`);
    }
    tapContext.updateScoreboard(nextTapState.score, nextTapState.combo);
    tapContext.markChecklistIf(
        nextTapState.combo >= tapContext.comboTarget,
        tapContext.comboChecklistId,
    );

    return {
        sequence: nextSequence,
        seqIndex: nextSeqIndex,
        combo: nextTapState.combo,
        score: nextTapState.score,
        misses: nextTapState.misses,
    };
};
