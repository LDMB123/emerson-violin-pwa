export const resetRhythmDashRun = ({
    stopMetronome,
    runToggle,
    setWasRunning,
    resetRuntimeState,
    setLiveScore,
    setLiveCombo,
    clearBpm,
    setRating,
    meterTrack,
    updateRunningState,
}) => {
    const { score, combo } = resetRuntimeState();
    stopMetronome();
    if (runToggle) runToggle.checked = false;
    setWasRunning(false);
    setLiveScore(score);
    setLiveCombo(combo);
    clearBpm();
    setRating('--', 'off', 0);
    if (meterTrack) {
        meterTrack.setAttribute('aria-valuenow', '0');
        meterTrack.setAttribute('aria-valuetext', '0%');
    }
    updateRunningState();
};
