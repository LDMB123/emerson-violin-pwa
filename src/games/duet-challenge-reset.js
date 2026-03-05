/** Resets Duet Challenge state, prompt, sequence, and playback controls. */
export const resetDuetChallengeSession = ({
    resetState,
    resetGameState,
    stopPartnerPlayback,
    updateScoreboard,
    buildSequence,
    setPrompt,
    setButtonsDisabled,
}) => {
    resetState();
    resetGameState();
    stopPartnerPlayback();
    updateScoreboard();
    buildSequence();
    setPrompt('Press play to hear the partner line.');
    setButtonsDisabled(true);
};
