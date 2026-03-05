/** Updates the Duet Challenge prompt text. */
export const setDuetChallengePrompt = (promptEl, message) => {
    if (promptEl) promptEl.textContent = message;
};

/** Renders the visible Duet Challenge note sequence and round label. */
export const renderDuetChallengeSequence = ({
    notesEl,
    roundEl,
    sequence,
    round,
}) => {
    if (notesEl) notesEl.textContent = sequence.join(' · ');
    if (roundEl) roundEl.textContent = `Round ${round}`;
};
