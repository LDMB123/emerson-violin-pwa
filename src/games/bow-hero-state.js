export const renderBowHeroStars = ({
    stars,
    starCount,
}) => {
    stars.forEach((star, index) => {
        star.classList.toggle('is-lit', index < starCount);
    });
};

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
