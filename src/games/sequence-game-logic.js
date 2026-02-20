export const applySequenceTap = ({
    note,
    targetNote,
    sequenceLength,
    seqIndex,
    combo,
    score,
    misses,
    baseScore,
    comboMult,
    missPenalty,
} = {}) => {
    if (note === targetNote) {
        const nextCombo = combo + 1;
        const nextScore = score + baseScore + nextCombo * comboMult;
        const nextSeqIndex = (seqIndex + 1) % sequenceLength;
        return {
            isCorrect: true,
            combo: nextCombo,
            score: nextScore,
            seqIndex: nextSeqIndex,
            misses,
            completedSequence: nextSeqIndex === 0,
        };
    }

    return {
        isCorrect: false,
        combo: 0,
        score: Math.max(0, score - missPenalty),
        seqIndex,
        misses: misses + 1,
        completedSequence: false,
    };
};
