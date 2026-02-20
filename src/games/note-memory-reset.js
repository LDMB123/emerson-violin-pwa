export const resetNoteMemorySession = ({
    stopTimer,
    resetMismatchReveal,
    resetRoundState,
    resetGameState,
    resetCards,
    shuffleValues,
    applyValuesToCards,
    updateHud,
}) => {
    stopTimer();
    resetMismatchReveal();
    resetRoundState();
    resetGameState();
    resetCards();
    const values = shuffleValues();
    applyValuesToCards(values);
    updateHud();
};
