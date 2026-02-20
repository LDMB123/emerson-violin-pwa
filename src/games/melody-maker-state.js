export const resetMelodyMakerTrackState = (gameState) => {
    if (gameState._track) gameState._track.length = 0;
    gameState.score = 0;
    gameState._lastSequence = '';
    gameState._repeatMarked = false;
    gameState._matchCount = 0;
    if (gameState._uniqueNotes) gameState._uniqueNotes.clear();
};
