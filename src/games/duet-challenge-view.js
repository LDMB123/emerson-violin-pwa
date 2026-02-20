export const setDuetChallengePrompt = (promptEl, message) => {
    if (promptEl) promptEl.textContent = message;
};

export const renderDuetChallengeSequence = ({
    notesEl,
    roundEl,
    sequence,
    round,
}) => {
    if (notesEl) notesEl.textContent = sequence.join(' · ');
    if (roundEl) roundEl.textContent = `Round ${round}`;
};
