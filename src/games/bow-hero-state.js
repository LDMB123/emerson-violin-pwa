/** Renders the Bow Hero star meter from the current star count. */
export const renderBowHeroStars = ({
    stars,
    starCount,
}) => {
    stars.forEach((star, index) => {
        star.classList.toggle('is-lit', index < starCount);
    });
};

/** Handles Bow Hero start/pause toggle changes and finalizes a partial run if needed. */
export const handleBowHeroRunToggleChange = ({
    runToggle,
    startTimer,
    stopTimer,
    resetPauseState,
    setStatus,
    strokeCount,
    finalizeRun,
}) => {
    if (runToggle.checked) {
        startTimer();
        return;
    }
    stopTimer();
    resetPauseState();
    setStatus('Paused. Tap Start to resume.');
    if (strokeCount > 0) {
        finalizeRun();
    }
};
