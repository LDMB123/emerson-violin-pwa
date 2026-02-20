export const resetNoteMemoryCards = (cards) => {
    cards.forEach((card) => {
        card.classList.remove('is-matched');
        const input = card.querySelector('input');
        if (input) {
            input.checked = false;
            input.disabled = false;
        }
    });
};

export const shuffleNoteValues = (values, random = Math.random) => {
    const shuffled = [...values];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const applyNoteValuesToCards = (cards, values) => {
    cards.forEach((card, index) => {
        const back = card.querySelector('.memory-back');
        if (back && values[index]) back.textContent = values[index];
    });
};
