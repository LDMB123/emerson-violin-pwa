import { setDisabled } from '../utils/dom-utils.js';

export const playDuetPartnerSequence = async ({
    partnerPlayback,
    sequence,
    playButton,
    partnerNoteTimeout,
    cueBank,
    isSoundEnabled,
    setPrompt,
}) => {
    if (partnerPlayback.playing) return;
    if (!isSoundEnabled()) {
        setPrompt('Sounds are off. Turn on Sounds to hear the partner.');
        return;
    }
    const token = partnerPlayback.nextToken();
    let completed = true;
    setDisabled(playButton, true);
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
        setDisabled(playButton, false);
        return completed;
    }
    return false;
};
