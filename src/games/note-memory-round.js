export const applyNoteMemoryMatchState = ({
    flipped,
    matches,
    matchStreak,
    score,
}) => {
    const matchedNotes = flipped.map(({ note }) => note).filter(Boolean);
    const nextMatches = matches + 1;
    const nextMatchStreak = matchStreak + 1;
    const nextScore = score + 120 + nextMatchStreak * 10;

    return {
        matchedNotes,
        matches: nextMatches,
        matchStreak: nextMatchStreak,
        score: nextScore,
    };
};

export const applyNoteMemoryMismatchState = ({ score }) => ({
    score: Math.max(0, score - 10),
    matchStreak: 0,
});
