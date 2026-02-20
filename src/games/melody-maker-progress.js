export const computeMelodySequenceProgress = ({
    track,
    lengthTarget,
    lastSequence,
    repeatMarked,
}) => {
    if (track.length < lengthTarget) {
        return {
            markStep1: false,
            markStep2: false,
            lastSequence,
            repeatMarked,
        };
    }
    const currentSequence = track.slice(-lengthTarget).join('');
    const shouldMarkRepeat = Boolean(lastSequence)
        && currentSequence === lastSequence
        && !repeatMarked;
    return {
        markStep1: true,
        markStep2: shouldMarkRepeat,
        lastSequence: currentSequence,
        repeatMarked: repeatMarked || shouldMarkRepeat,
    };
};

export const computeMelodyTargetMatch = ({
    track,
    targetMotif,
    matchCount,
    score,
}) => {
    if (track.length < targetMotif.length) return null;
    const attempt = track.slice(-targetMotif.length).join('');
    const target = targetMotif.join('');
    if (attempt !== target) return null;
    return {
        matchCount: matchCount + 1,
        score: score + 50,
    };
};
