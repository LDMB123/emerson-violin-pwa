export const createSequenceGameRuntime = ({
    notePool,
    sequenceLength,
    buildNoteSequence,
}) => {
    const runtime = {
        sequence: notePool.slice(),
        seqIndex: 0,
        combo: 0,
        score: 0,
        misses: 0,
        sessionStartedAt: Date.now(),
        hitNotes: new Set(),
        lastCorrectNote: null,
    };

    const buildSequence = () => {
        runtime.sequence = buildNoteSequence(notePool, sequenceLength);
        runtime.seqIndex = 0;
        return {
            sequence: runtime.sequence,
            seqIndex: runtime.seqIndex,
        };
    };

    const resetCoreState = () => {
        runtime.combo = 0;
        runtime.score = 0;
        runtime.misses = 0;
        runtime.seqIndex = 0;
    };

    const applyTapResult = (nextState) => {
        runtime.sequence = nextState.sequence;
        runtime.seqIndex = nextState.seqIndex;
        runtime.combo = nextState.combo;
        runtime.score = nextState.score;
        runtime.misses = nextState.misses;
    };

    const setSessionStartedAt = (value) => {
        runtime.sessionStartedAt = value;
    };

    const setLastCorrectNote = (value) => {
        runtime.lastCorrectNote = value;
    };

    return {
        runtime,
        buildSequence,
        resetCoreState,
        applyTapResult,
        setSessionStartedAt,
        setLastCorrectNote,
    };
};
