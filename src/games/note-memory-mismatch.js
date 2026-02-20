export const createNoteMemoryMismatchReveal = ({
    clearLock,
    updateHud,
    delayMs = 600,
}) => {
    let mismatchTimer = null;

    const reset = () => {
        if (mismatchTimer) {
            clearTimeout(mismatchTimer);
            mismatchTimer = null;
        }
    };

    const scheduleReveal = (flippedEntries) => {
        reset();
        mismatchTimer = window.setTimeout(() => {
            flippedEntries.forEach(({ input }) => {
                if (input) input.checked = false;
            });
            clearLock();
            updateHud();
            mismatchTimer = null;
        }, delayMs);
    };

    return {
        reset,
        scheduleReveal,
    };
};
