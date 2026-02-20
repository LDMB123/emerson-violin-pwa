export const syncStorySongGameState = ({
    gameState,
    pageIndex,
    completedNotes,
    completedPages,
    isPlaying,
    score,
}) => {
    if (typeof pageIndex === 'number') gameState._pageIndex = pageIndex;
    if (typeof completedNotes === 'number') gameState._completedNotes = completedNotes;
    if (typeof completedPages === 'number') gameState._completedPages = completedPages;
    if (typeof isPlaying === 'boolean') gameState._isPlaying = isPlaying;
    if (typeof score === 'number') gameState.score = score;
};

export const computeStorySongProgressAfterPage = ({
    completedNotes,
    completedPages,
    pageIndex,
    noteCount,
}) => {
    const nextCompletedNotes = completedNotes + noteCount;
    const nextCompletedPages = Math.max(completedPages, pageIndex + 1);
    const nextScore = nextCompletedNotes * 12 + nextCompletedPages * 40;
    return {
        completedNotes: nextCompletedNotes,
        completedPages: nextCompletedPages,
        score: nextScore,
    };
};

export const resetStorySongProgressState = ({
    gameState,
    setPageIndex,
    setCompletedNotes,
    setCompletedPages,
}) => {
    setPageIndex(0);
    setCompletedNotes(0);
    setCompletedPages(0);
    syncStorySongGameState({
        gameState,
        pageIndex: 0,
        completedNotes: 0,
        completedPages: 0,
        score: 0,
    });
};
