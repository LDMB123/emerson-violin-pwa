export const resolvePitchQuestAttempt = ({
    feature,
    targetNote,
    tolerance,
    streak,
    score,
    stars,
}) => {
    const cents = Number.isFinite(feature.cents) ? feature.cents : 0;
    const inTune = Math.abs(cents) <= tolerance;
    const matchedNote = (feature.note || '').startsWith(targetNote);
    const matched = inTune && matchedNote;

    if (matched) {
        const nextStreak = streak + 1;
        return {
            matched: true,
            nextStreak,
            nextScore: score + 20 + nextStreak * 4,
            nextStars: Math.max(stars, Math.min(3, Math.ceil(nextStreak / 2))),
            audioNote: targetNote,
            audioOptions: { duration: 0.3, volume: 0.2, type: 'triangle' },
            markStep6: nextStreak >= 2,
        };
    }

    return {
        matched: false,
        nextStreak: 0,
        nextScore: Math.max(0, score - 8),
        nextStars: stars,
        audioNote: cents > 0 ? 'F#' : 'F',
        audioOptions: { duration: 0.2, volume: 0.14, type: 'sawtooth' },
        markStep6: false,
    };
};
