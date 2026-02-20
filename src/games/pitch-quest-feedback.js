export const formatPitchQuestTargetStatus = ({
    targetNote,
    tolerance,
}) => (targetNote ? `Target: ${targetNote} · ±${tolerance}¢` : 'Pick a target note.');

export const formatPitchQuestFeedback = ({
    hasSignal,
    inTune,
    matchingNote,
    targetNote,
    cents,
}) => {
    if (!hasSignal) {
        return 'Listening for your note...';
    }
    if (inTune && matchingNote) {
        return `Great lock on ${targetNote}.`;
    }
    if (!matchingNote) {
        return `Aim for ${targetNote || 'the target note'}.`;
    }
    return cents > 0 ? 'A little lower.' : 'A little higher.';
};
