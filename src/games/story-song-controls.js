export const stopStorySongPlayback = ({
    playback,
    toggle,
    keepToggle = false,
    message,
    updateStatus,
    setIsPlaying,
}) => {
    playback.stop();
    setIsPlaying(playback.playing);
    if (!keepToggle && toggle) {
        toggle.checked = false;
    }
    if (message) {
        updateStatus(message);
    }
};
