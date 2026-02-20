import {
    computeMelodySequenceProgress,
    computeMelodyTargetMatch,
} from './melody-maker-progress.js';

const applyMelodySequenceProgress = ({
    gameState,
    lengthTarget,
    markChecklist,
}) => {
    const progress = computeMelodySequenceProgress({
        track: gameState._track,
        lengthTarget,
        lastSequence: gameState._lastSequence,
        repeatMarked: gameState._repeatMarked,
    });
    gameState._lastSequence = progress.lastSequence;
    gameState._repeatMarked = progress.repeatMarked;
    if (progress.markStep1) markChecklist('mm-step-1');
    if (progress.markStep2) markChecklist('mm-step-2');
};

const applyMelodyTargetMatch = ({
    gameState,
    updateScore,
    setStatus,
    buildTarget,
    reportSession,
    markChecklist,
}) => {
    const targetMatch = computeMelodyTargetMatch({
        track: gameState._track,
        targetMotif: gameState._targetMotif,
        matchCount: gameState._matchCount,
        score: gameState.score,
    });
    if (!targetMatch) return;
    gameState._matchCount = targetMatch.matchCount;
    gameState.score = targetMatch.score;
    updateScore();
    setStatus(`Target hit! ${gameState._matchCount} in a row.`);
    if (gameState._matchCount >= 1) markChecklist('mm-step-1');
    if (gameState._matchCount >= 2) markChecklist('mm-step-2');
    if (gameState._matchCount >= 3) reportSession();
    buildTarget();
};

export const handleMelodyMakerNoteTap = ({
    note,
    gameState,
    playback,
    stopPlayback,
    playTapPreview,
    updateTrack,
    updateScore,
    lengthTarget,
    setStatus,
    buildTarget,
    reportSession,
    markChecklist,
    markChecklistIf,
}) => {
    if (playback.playing) {
        stopPlayback('Editing melody. Tap Play to hear it.');
    }
    gameState._track.push(note);
    if (gameState._track.length > gameState._maxTrack) gameState._track.shift();
    gameState.score += 20;
    gameState._uniqueNotes.add(note);
    playTapPreview(note);
    updateTrack();
    updateScore();
    applyMelodySequenceProgress({
        gameState,
        lengthTarget,
        markChecklist,
    });
    markChecklistIf(gameState._uniqueNotes.size >= 3, 'mm-step-3');
    applyMelodyTargetMatch({
        gameState,
        updateScore,
        setStatus,
        buildTarget,
        reportSession,
        markChecklist,
    });
};
