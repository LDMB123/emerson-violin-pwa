import {
    applyNoteMemoryMatchState,
    applyNoteMemoryMismatchState,
} from './note-memory-round.js';

export const createNoteMemoryRoundHandlers = ({
    getRoundSnapshot,
    applyRoundSnapshot,
    markMatchedCards,
    updateGameState,
    playMatchSequence,
    totalPairs,
    onCompleteAllPairs,
    scheduleMismatchReveal,
    releaseLock,
    updateHud,
}) => {
    const handleMatch = () => {
        const snapshot = getRoundSnapshot();
        const nextState = applyNoteMemoryMatchState({
            flipped: snapshot.flipped,
            matches: snapshot.matches,
            matchStreak: snapshot.matchStreak,
            score: snapshot.score,
        });
        const { matchedNotes } = nextState;
        markMatchedCards(snapshot.flipped);
        applyRoundSnapshot({
            ...snapshot,
            flipped: [],
            matches: nextState.matches,
            matchStreak: nextState.matchStreak,
            score: nextState.score,
        });
        releaseLock();
        updateGameState({
            matches: nextState.matches,
            score: nextState.score,
        });
        if (matchedNotes.length) {
            playMatchSequence(matchedNotes);
        }
        if (nextState.matches >= totalPairs) {
            onCompleteAllPairs();
        }
        updateHud();
    };

    const handleMismatch = () => {
        const snapshot = getRoundSnapshot();
        const nextState = applyNoteMemoryMismatchState({ score: snapshot.score });
        applyRoundSnapshot({
            ...snapshot,
            flipped: [],
            score: nextState.score,
            matchStreak: nextState.matchStreak,
        });
        updateGameState({ score: nextState.score });
        scheduleMismatchReveal(snapshot.flipped.slice());
    };

    return {
        handleMatch,
        handleMismatch,
    };
};
