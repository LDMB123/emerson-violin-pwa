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
import { shuffleNoteValues } from './note-memory-cards.js';
import { createNoteMemoryTimer } from './note-memory-timer.js';
import { NoteMemoryCanvasEngine } from './note-memory-canvas.js';
import { renderNoteMemoryHud } from './note-memory-view.js';

const memoryMatchesEl = cachedEl('[data-memory="matches"]');
const memoryScoreEl = cachedEl('[data-memory="score"]');

const updateNoteMemory = () => {
    // Legacy readout logic, safely exits if no canvas
    const canvas = document.getElementById('note-memory-canvas');
    if (!canvas) return;

    // We let the Engine handle its own internal state, so we just read DOM for meta
    const matchesEl = memoryMatchesEl();
    const scoreEl = memoryScoreEl();
    const liveMatches = readLiveNumber(matchesEl, 'liveMatches');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');

    if (matchesEl) {
        matchesEl.textContent = `${liveMatches || 0}/6`;
    }
    if (scoreEl) {
        scoreEl.textContent = String(liveScore || 0);
    }
};

const { bind } = createGame({
    id: 'note-memory',
    computeAccuracy: (state) => state._totalPairs
        ? (state.matches / state._totalPairs) * 100
        : 0,
    onReset: (gameState) => {
        if (gameState._timerId) return;
        gameState._resetGame?.();
    },
    onBind: (stage, difficulty, { reportSession, gameState, registerCleanup }) => {
        const canvasEl = stage.querySelector('#note-memory-canvas');
        if (!canvasEl) return;

        const timerEl = stage.querySelector('[data-memory="timer"]');
        const matchesEl = stage.querySelector('[data-memory="matches"]');
        const scoreEl = stage.querySelector('[data-memory="score"]');
        const streakEl = stage.querySelector('[data-memory="streak"]');
        const resetButton = stage.querySelector('[data-memory="reset"]');

        const totalPairs = 6; // Fixed for 12 cards
        const baseValues = ['G', 'D', 'A', 'E', 'C', 'B', 'G', 'D', 'A', 'E', 'C', 'B'];

        let flipped = [];
        let lock = false;
        let matches = 0;
        let score = 0;
        let matchStreak = 0;

        const timeLimit = Math.round(45 * difficulty.speed);
        let timeLeft = timeLimit;
        let ended = false;

        gameState._totalPairs = totalPairs;
        gameState._timerId = null;
        gameState.matches = 0;

        // Initialize WebGL Canvas Engine
        const engine = new NoteMemoryCanvasEngine(canvasEl);
        engine.start();

        registerCleanup(() => {
            engine.destroy();
        });

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
            setTimeLeft: (value) => { timeLeft = value; },
            getEnded: () => ended,
            setEnded: (value) => { ended = value; },
            clearLock: () => { lock = false; },
            updateHud,
            finalizeGame,
            setGameTimerId: (value) => { gameState._timerId = value; },
            isViewActive: () => window.location.hash === '#view-game-note-memory',
        });

        gameState._onDeactivate = () => {
            timer.pauseTimer();
            stopTonePlayer();
            engine.stop();
        };

        const resetGame = () => {
            timer.stopTimer();
            flipped = [];
            lock = false;
            matches = 0;
            score = 0;
            matchStreak = 0;
            timeLeft = timeLimit;
            ended = false;

            gameState.matches = 0;
            gameState.score = 0;

            const shuffled = shuffleNoteValues(baseValues);
            engine.reset();
            engine.setCards(shuffled);
            updateHud();
        };

        gameState._resetGame = resetGame;

        // Note Memory Core Logic mapped to Canvas events
        engine.onCardTapped = (card) => {
            if (lock || card.isFlipped || card.isMatched || ended) return;

            if (!timer.isRunning()) timer.startTimer();

            playToneNote(card.note, { duration: 0.24, volume: 0.18, type: 'triangle' });
            engine.flipCard(card.id, true);
            flipped.push(card);

            if (flipped.length === 2) {
                lock = true;
                const [c1, c2] = flipped;

                if (c1.note === c2.note) {
                    // Match!
                    engine.matchCards(c1.id, c2.id);
                    playToneSequence([c1.note, c2.note], { tempo: 140, gap: 0.1, duration: 0.22, volume: 0.18, type: 'triangle' });

                    matches += 1;
                    matchStreak += 1;
                    score += 100 * matchStreak;

                    gameState.matches = matches;
                    gameState.score = score;

                    flipped = [];
                    lock = false;

                    if (matches >= totalPairs) {
                        ended = true;
                        timer.stopTimer();
                        finalizeGame();
                    }
                } else {
                    // Mismatch
                    matchStreak = 0;
                    score = Math.max(0, score - 20);
                    gameState.score = score;

                    // Delay before flipping back
                    setTimeout(() => {
                        engine.flipCard(c1.id, false);
                        engine.flipCard(c2.id, false);
                        flipped = [];
                        lock = false;
                    }, 800);
                }
                updateHud();
            }
        };

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
            onHidden: () => {
                timer.pauseTimer();
                engine.stop();
            },
            onVisible: () => {
                timer.resumeTimer();
                engine.start();
            },
            registerCleanup,
        });

        if (window.location.hash === '#view-game-note-memory') {
            resetGame();
        }
    },
});

export { updateNoteMemory as update, bind };
