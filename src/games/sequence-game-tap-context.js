export const pickSequenceRuntimeState = (runtimeState) => ({
    sequence: runtimeState.sequence,
    seqIndex: runtimeState.seqIndex,
    combo: runtimeState.combo,
    score: runtimeState.score,
    misses: runtimeState.misses,
});

export const buildSequenceTapPayload = ({ note, runtimeState, tapContext }) => ({
    note,
    ...pickSequenceRuntimeState(runtimeState),
    tapContext,
});
