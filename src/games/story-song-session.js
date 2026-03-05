/** Validates and prepares Story Song playback before a play-along run starts. */
export const prepareStorySongPlayback = ({
    toggle,
    isSoundEnabled,
    stopPlayback,
    getPlayer,
    pageIndex,
    storyPagesLength,
    hasReported,
    resetStoryProgress,
    playback,
    syncIsPlaying,
    markChecklist,
    updateStatus,
}) => {
    if (!toggle || !toggle.checked) return null;
    if (!isSoundEnabled()) {
        stopPlayback({ message: 'Sounds are off. Enable Sounds to play along.' });
        return null;
    }
    const player = getPlayer();
    if (!player) {
        stopPlayback({ message: 'Audio is unavailable on this device.' });
        return null;
    }
    if (pageIndex >= storyPagesLength || hasReported) {
        resetStoryProgress();
    }
    const token = playback.nextToken();
    syncIsPlaying(playback.playing);
    markChecklist('ss-step-1');
    updateStatus('Play-along running — follow the notes.');
    return { player, token };
};

/** Finalizes one Story Song playback token and updates UI/reporting state. */
export const finalizeStorySongPlayback = ({
    token,
    playback,
    syncIsPlaying,
    pageIndex,
    storyPagesLength,
    toggle,
    updateStatus,
    reportSession,
}) => {
    if (!playback.isCurrent(token)) return;
    playback.finish(token);
    syncIsPlaying(playback.playing);
    if (pageIndex >= storyPagesLength) {
        updateStatus('Story complete! Tap Play-Along to replay.');
        if (toggle) toggle.checked = false;
        reportSession();
        return;
    }
    if (!toggle?.checked) {
        updateStatus('Play-along paused. Tap Play-Along to resume.');
        return;
    }
    updateStatus('Play-along ready. Tap Play-Along to continue.');
};
