const createNoteMemoryCardChangeHandler = ({
    input,
    card,
    getLock,
    setLock,
    getEnded,
    resetGame,
    isTimerRunning,
    startTimer,
    noteForCard,
    getFlipped,
    setFlipped,
    playCardTone,
    handleMatch,
    handleMismatch,
}) => () => {
    if (!input.checked) return;
    if (getLock()) {
        input.checked = false;
        return;
    }
    if (getEnded()) {
        resetGame();
        input.checked = false;
        return;
    }
    if (input.disabled) return;
    if (!isTimerRunning()) startTimer();
    const note = noteForCard(card);
    const nextFlipped = getFlipped().concat({ card, input, note });
    setFlipped(nextFlipped);
    if (note) {
        playCardTone(note);
    }
    if (nextFlipped.length === 2) {
        setLock(true);
        if (nextFlipped[0].note && nextFlipped[0].note === nextFlipped[1].note) {
            handleMatch();
        } else {
            handleMismatch();
        }
    }
};

export const bindNoteMemoryCardInputs = ({
    cards,
    getLock,
    setLock,
    getEnded,
    resetGame,
    isTimerRunning,
    startTimer,
    noteForCard,
    getFlipped,
    setFlipped,
    playCardTone,
    handleMatch,
    handleMismatch,
}) => {
    cards.forEach((card) => {
        const input = card.querySelector('input');
        if (!input) return;
        input.addEventListener('change', createNoteMemoryCardChangeHandler({
            input,
            card,
            getLock,
            setLock,
            getEnded,
            resetGame,
            isTimerRunning,
            startTimer,
            noteForCard,
            getFlipped,
            setFlipped,
            playCardTone,
            handleMatch,
            handleMismatch,
        }));
    });
};
