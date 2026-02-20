export const startDuetChallengeRound = ({
    isSoundEnabled,
    setPrompt,
    setActive,
    buildSequence,
    getSequence,
    setButtonsDisabled,
    playPartnerSequence,
    markChecklist,
}) => {
    if (!isSoundEnabled()) {
        setPrompt('Sounds are off. Turn on Sounds to hear the partner.');
        return;
    }
    setActive(false);
    buildSequence();
    setPrompt(`Partner plays: ${getSequence().join(' \u00b7 ')}`);
    setButtonsDisabled(true);
    playPartnerSequence().then((completed) => {
        if (!completed) return;
        setActive(true);
        setButtonsDisabled(false);
        setPrompt(`Your turn: ${getSequence().join(' \u00b7 ')}`);
    });
    markChecklist('dc-step-1');
};

export const ensureDuetChallengeReadyForTap = ({
    isPartnerPlaying,
    active,
    setPrompt,
}) => {
    if (isPartnerPlaying) {
        setPrompt('Wait for the partner line to finish.');
        return false;
    }
    if (!active) {
        setPrompt('Press play to hear the partner line.');
        return false;
    }
    return true;
};
