export const createStorySongVisibilityHandlers = ({
    toggle,
    stopPlayback,
    statusEl,
    getWasPlaying,
    setWasPlaying,
}) => ({
    onHidden: () => {
        if (!toggle) return;
        setWasPlaying(toggle.checked);
        stopPlayback({ message: 'Play-along paused.' });
    },
    onVisible: () => {
        if (!getWasPlaying()) return;
        setWasPlaying(false);
        if (statusEl) {
            statusEl.textContent = 'Play-along paused. Tap Play-Along to resume.';
        }
    },
});
