/** Resets the current Sequence Game session state and side effects. */
export const resetSequenceSessionState = ({
    stopTonePlayer,
    resetCoreState,
    hitNotes,
    setLastCorrectNote,
    setSessionStartedAt,
    onReset,
    callbackState,
    buildSequence,
    updateTargets,
    updateScoreboard,
}) => {
    stopTonePlayer();
    resetCoreState();
    hitNotes.clear();
    setLastCorrectNote(null);
    setSessionStartedAt(Date.now());
    if (onReset) onReset(callbackState);
    buildSequence();
    updateTargets();
    updateScoreboard();
};
