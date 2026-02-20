export const renderEarTrainerDots = ({
    dots,
    currentIndex,
    rounds,
}) => {
    dots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === currentIndex && index < rounds);
        dot.classList.toggle('is-disabled', index >= rounds);
    });
};

export const setEarTrainerQuestion = (questionEl, text) => {
    if (!questionEl) return;
    questionEl.textContent = text;
    questionEl.dataset.live = 'true';
};

export const clearEarTrainerChoices = (choices) => {
    choices.forEach((choice) => {
        choice.checked = false;
    });
};
