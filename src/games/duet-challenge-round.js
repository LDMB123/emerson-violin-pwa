/** Starts a Duet Challenge round and plays the partner sequence when audio is enabled. */
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
    const soundEnabled = isSoundEnabled();
    if (!soundEnabled) {
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

/** Returns whether Duet Challenge is ready to accept a player tap. */
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
