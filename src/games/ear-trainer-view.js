/** Updates the ear-trainer progress dots for the current round and index. */
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

/** Sets the current ear-trainer prompt text and flags it as live content. */
export const setEarTrainerQuestion = (questionEl, text) => {
    if (!questionEl) return;
    questionEl.textContent = text;
    questionEl.dataset.live = 'true';
};

/** Clears all selected ear-trainer choice inputs. */
export const clearEarTrainerChoices = (choices) => {
    for (const choice of choices) {
        choice.checked = false;
    }
};
