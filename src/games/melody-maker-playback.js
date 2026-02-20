export const playMelodyMakerSequence = async ({
    notes,
    isSoundEnabled,
    setStatus,
    getPlayer,
    playback,
    tempo,
    setIsPlaying,
    startMessage,
    successMessage = 'Nice! Try a new variation or hit Play again.',
    emptyMessage = 'Add notes to hear your melody.',
    soundsOffMessage = 'Sounds are off. Enable Sounds to play.',
    unavailableMessage = 'Audio is unavailable on this device.',
    onComplete,
}) => {
    if (!notes.length) {
        setStatus(emptyMessage);
        return;
    }
    if (!isSoundEnabled()) {
        setStatus(soundsOffMessage);
        return;
    }
    const player = getPlayer();
    if (!player) {
        setStatus(unavailableMessage);
        return;
    }
    const token = playback.nextToken();
    setIsPlaying(playback.playing);
    setStatus(startMessage);
    const played = await player.playSequence(notes, {
        tempo,
        gap: 0.12,
        duration: 0.4,
        volume: 0.22,
        type: 'triangle',
    });
    if (!playback.isCurrent(token) || !played) return;
    playback.finish(token);
    setIsPlaying(playback.playing);
    setStatus(successMessage);
    onComplete?.();
};
