export const applyDuetCorrectTurn = ({
    combo,
    score,
    seqIndex,
    sequence,
    comboTarget,
    round,
}) => {
    const nextCombo = combo + 1;
    const nextScore = score + 15 + nextCombo * 2;
    const nextSeqIndex = seqIndex + 1;
    const completedRound = nextSeqIndex >= sequence.length;
    return {
        combo: nextCombo,
        score: nextScore,
        seqIndex: nextSeqIndex,
        round: completedRound ? round + 1 : round,
        completedRound,
        markStep2: nextSeqIndex === 1,
        markStep3: nextCombo >= comboTarget,
        markStep4: completedRound,
        prompt: completedRound
            ? 'Great duet! Play again for a new combo.'
            : `Your turn: ${sequence.slice(nextSeqIndex).join(' · ')}`,
    };
};

export const applyDuetIncorrectTurn = ({
    mistakes,
}) => ({
    combo: 0,
    mistakes: mistakes + 1,
    seqIndex: 0,
    prompt: 'Try again from the start.',
});
