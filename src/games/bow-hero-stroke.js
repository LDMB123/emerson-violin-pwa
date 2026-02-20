export const computeBowStrokeFeedback = ({
    lastStrokeAt,
    now,
    targetTempo,
    smoothStreak,
}) => {
    if (!lastStrokeAt) {
        return {
            smoothStreak,
            statusMessage: 'Nice stroke! Keep going.',
        };
    }
    const interval = now - lastStrokeAt;
    const bpm = Math.round(60000 / Math.max(120, interval));
    const deviation = Math.abs(bpm - targetTempo) / Math.max(targetTempo, 1);
    if (deviation <= 0.18) {
        const nextSmoothStreak = smoothStreak + 1;
        return {
            smoothStreak: nextSmoothStreak,
            statusMessage: `Smooth strokes! ${bpm} BPM · streak x${nextSmoothStreak}.`,
        };
    }
    return {
        smoothStreak: 0,
        statusMessage: `Aim for ${targetTempo} BPM · current ${bpm} BPM.`,
    };
};

export const resolveBowStrokeNote = (strokeCount) => (strokeCount % 2 === 0 ? 'A' : 'D');
