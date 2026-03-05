/** Picks the sequence-game runtime fields needed for tap event payloads. */
export const pickSequenceRuntimeState = (runtimeState) => ({
    sequence: runtimeState.sequence,
    seqIndex: runtimeState.seqIndex,
    combo: runtimeState.combo,
    score: runtimeState.score,
    misses: runtimeState.misses,
});

/** Builds a normalized tap payload for sequence-style game interactions. */
export const buildSequenceTapPayload = ({ note, runtimeState, tapContext }) => ({
    note,
    ...pickSequenceRuntimeState(runtimeState),
    tapContext,
});
