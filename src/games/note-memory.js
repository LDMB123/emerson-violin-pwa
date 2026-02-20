import { createGame } from './game-shell.js';
import { bindVisibilityLifecycle } from './game-interactive-runtime.js';
import {
    cachedEl,
    readLiveNumber,
    bindTap,
    playToneNote,
    playToneSequence,
    stopTonePlayer,
    bindSoundsChange,
} from './shared.js';
import {
    resetNoteMemoryCards,
    shuffleNoteValues,
    applyNoteValuesToCards,
} from './note-memory-cards.js';
import { createNoteMemoryTimer } from './note-memory-timer.js';
import {
    bindNoteMemoryCardInputs,
} from './note-memory-input.js';
import { createNoteMemoryMismatchReveal } from './note-memory-mismatch.js';
import { createNoteMemoryRoundHandlers } from './note-memory-effects.js';
import { resetNoteMemorySession } from './note-memory-reset.js';
import { renderNoteMemoryHud } from './note-memory-view.js';

const memoryMatchesEl = cachedEl('[data-memory="matches"]');
const memoryScoreEl = cachedEl('[data-memory="score"]');

const updateNoteMemory = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-note-memory input[id^="nm-card-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const pairs = Math.floor(checked / 2);
    const matchesEl = memoryMatchesEl();
    const scoreEl = memoryScoreEl();
    const liveMatches = readLiveNumber(matchesEl, 'liveMatches');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');

    if (matchesEl) {
        const value = Number.isFinite(liveMatches) ? liveMatches : pairs;
        matchesEl.textContent = `${value}/6`;
    }
    if (scoreEl) {
        const score = Number.isFinite(liveScore) ? liveScore : pairs * 60;
        scoreEl.textContent = String(score);
    }
};

const { bind } = createGame({
    id: 'note-memory',
    computeAccuracy: (state) => state._totalPairs
        ? (state.matches / state._totalPairs) * 100
        : 0,
    onReset: (gameState) => {
        // If timer is running, don't reset (tuning change mid-game)
        if (gameState._timerId) return;
        gameState._resetGame?.();
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
        const cards = Array.from(stage.querySelectorAll('.memory-card'));
        const timerEl = stage.querySelector('[data-memory="timer"]');
        const matchesEl = stage.querySelector('[data-memory="matches"]');
        const scoreEl = stage.querySelector('[data-memory="score"]');
        const streakEl = stage.querySelector('[data-memory="streak"]');
        const resetButton = stage.querySelector('[data-memory="reset"]');

        if (!cards.length) return;
        const totalPairs = Math.floor(cards.length / 2);
        const noteValues = cards.map((card) => card.querySelector('.memory-back')?.textContent?.trim() || '');
        let flipped = [];
        let lock = false;
        let matches = 0;
        let score = 0;
        let matchStreak = 0;
        // difficulty.speed: scales timeLimit; speed=1.0 keeps timeLimit=45s (current behavior)
        // difficulty.complexity: visual feedback only for this game (card grid is fixed in HTML)
        const timeLimit = Math.round(45 * difficulty.speed);
        let timeLeft = timeLimit;
        let ended = false;

        // Store on gameState for computeAccuracy and onReset
        gameState._totalPairs = totalPairs;
        gameState._timerId = null;
        gameState.matches = 0;

        const updateHud = () => {
            renderNoteMemoryHud({
                matchesEl,
                scoreEl,
                streakEl,
                timerEl,
                matches,
                totalPairs,
                score,
                matchStreak,
                timeLeft,
            });
        };

        const finalizeGame = () => {
            gameState.matches = matches;
            gameState.score = score;
            reportSession();
        };
        const timer = createNoteMemoryTimer({
            getTimeLeft: () => timeLeft,
            setTimeLeft: (value) => {
                timeLeft = value;
            },
            getEnded: () => ended,
            setEnded: (value) => {
                ended = value;
            },
            clearLock: () => {
                lock = false;
            },
            updateHud,
            finalizeGame,
            setGameTimerId: (value) => {
                gameState._timerId = value;
            },
            isViewActive: () => window.location.hash === '#view-game-note-memory',
        });
        const mismatchReveal = createNoteMemoryMismatchReveal({
            clearLock: () => {
                lock = false;
            },
            updateHud,
        });

        gameState._onDeactivate = () => {
            timer.pauseTimer();
            stopTonePlayer();
        };

        const resetGame = () => {
            resetNoteMemorySession({
                stopTimer: () => {
                    timer.stopTimer();
                },
                resetMismatchReveal: () => {
                    mismatchReveal.reset();
                },
                resetRoundState: () => {
                    flipped = [];
                    lock = false;
                    matches = 0;
                    score = 0;
                    matchStreak = 0;
                    timeLeft = timeLimit;
                    ended = false;
                },
                resetGameState: () => {
                    gameState.matches = 0;
                    gameState.score = 0;
                },
                resetCards: () => {
                    resetNoteMemoryCards(cards);
                },
                shuffleValues: () => shuffleNoteValues(noteValues),
                applyValuesToCards: (values) => {
                    applyNoteValuesToCards(cards, values);
                },
                updateHud,
            });
        };

        // Expose resetGame for onReset
        gameState._resetGame = resetGame;

        const noteForCard = (card) => {
            const value = card.querySelector('.memory-back')?.textContent?.trim();
            return value || '';
        };
        const {
            handleMatch,
            handleMismatch,
        } = createNoteMemoryRoundHandlers({
            getRoundSnapshot: () => ({
                flipped,
                matches,
                matchStreak,
                score,
            }),
            applyRoundSnapshot: (snapshot) => {
                flipped = snapshot.flipped;
                matches = snapshot.matches;
                matchStreak = snapshot.matchStreak;
                score = snapshot.score;
            },
            markMatchedCards: (entries) => {
                entries.forEach(({ card, input }) => {
                    card.classList.add('is-matched');
                    if (input) input.disabled = true;
                });
            },
            updateGameState: ({ matches: nextMatches = matches, score: nextScore = score } = {}) => {
                gameState.matches = nextMatches;
                gameState.score = nextScore;
            },
            playMatchSequence: (notes) => {
                playToneSequence(notes, { tempo: 140, gap: 0.1, duration: 0.22, volume: 0.18, type: 'triangle' });
            },
            totalPairs,
            onCompleteAllPairs: () => {
                ended = true;
                timer.stopTimer();
                finalizeGame();
            },
            scheduleMismatchReveal: (entries) => {
                mismatchReveal.scheduleReveal(entries);
            },
            releaseLock: () => {
                lock = false;
            },
            updateHud,
        });

        bindNoteMemoryCardInputs({
            cards,
            getLock: () => lock,
            setLock: (value) => {
                lock = value;
            },
            getEnded: () => ended,
            resetGame,
            isTimerRunning: () => timer.isRunning(),
            startTimer: () => {
                timer.startTimer();
            },
            noteForCard,
            getFlipped: () => flipped,
            setFlipped: (value) => {
                flipped = value;
            },
            playCardTone: (note) => {
                playToneNote(note, { duration: 0.24, volume: 0.18, type: 'triangle' });
            },
            handleMatch,
            handleMismatch,
        });

        bindTap(resetButton, () => {
            resetGame();
        });

        const soundsHandler = (event) => {
            if (event.detail?.enabled === false) {
                stopTonePlayer();
            }
        };
        bindSoundsChange(soundsHandler, registerCleanup);

        updateHud();

        bindVisibilityLifecycle({
            onHidden: timer.pauseTimer,
            onVisible: timer.resumeTimer,
            registerCleanup,
        });

        if (window.location.hash === '#view-game-note-memory') {
            resetGame();
        }
    },
});

export { updateNoteMemory as update, bind };
