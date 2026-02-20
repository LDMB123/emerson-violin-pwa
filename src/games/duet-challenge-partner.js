export const playDuetPartnerSequence = async ({
    partnerPlayback,
    isSoundEnabled,
    setPrompt,
    playButton,
    sequence,
    cueBank,
    partnerNoteTimeout,
}) => {
    if (partnerPlayback.playing) return;
    if (!isSoundEnabled()) {
        setPrompt('Sounds are off. Turn on Sounds to hear the partner.');
        return;
    }
    const token = partnerPlayback.nextToken();
    let completed = true;
    if (playButton) playButton.disabled = true;
    setPrompt('Partner playing… get ready to respond.');
    for (const note of sequence) {
        if (!partnerPlayback.isCurrent(token)) {
            completed = false;
            break;
        }
        await cueBank.play(note, {
            timeoutMs: partnerNoteTimeout,
            isCancelled: () => !partnerPlayback.isCurrent(token) || !isSoundEnabled(),
        });
    }
    if (partnerPlayback.finish(token)) {
        if (playButton) playButton.disabled = false;
        return completed;
    }
    return false;
};
