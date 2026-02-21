import { createGame } from './game-shell.js';
import { createAudioCueBank } from './game-audio-cues.js';
import {
    cachedEl,
    markChecklist,
    markChecklistIf,
    bindTap,
    playToneNote,
    bindSoundsChange,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import {
    renderEarTrainerDots,
    setEarTrainerQuestion,
    clearEarTrainerChoices,
} from './ear-trainer-view.js';
import { EarTrainerCanvasEngine } from './ear-trainer-canvas.js';

const earQuestionEl = cachedEl('[data-ear="question"]');

const updateEarTrainer = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-ear-trainer input[id^="et-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const questionEl = earQuestionEl();
    if (questionEl && checked > 0 && !questionEl.dataset.live) {
        questionEl.textContent = `Rounds complete: ${checked}/${inputs.length}`;
    }
};

const { bind } = createGame({
    id: 'ear-trainer',
    computeAccuracy: (state) => state.totalAnswered
        ? (state.correctCount / state.totalAnswered) * 100
        : 0,
    onReset: (gameState) => {
        gameState.currentIndex = 0;
        gameState.currentTone = null;
        gameState.correctStreak = 0;
        gameState.correctCount = 0;
        gameState.totalAnswered = 0;
        const rounds = gameState._rounds || 0;
        if (gameState._dots) {
            gameState._dots.forEach((dot) => {
                dot.classList.remove('is-correct', 'is-wrong');
            });
        }
        if (gameState._choices) {
            gameState._choices.forEach((choice) => {
                choice.checked = false;
            });
        }
        if (gameState._setActiveDot) gameState._setActiveDot();
        if (gameState._setQuestion) gameState._setQuestion(`Question 1 of ${rounds}`);
        if (gameState._updateStreak) gameState._updateStreak();
    },
    onBind: (stage, difficulty, { reportSession, resetSession, gameState, registerCleanup }) => {
        const levelEl = stage.querySelector('[data-ear="level"]');
        const livesEl = stage.querySelector('[data-ear="lives"]');
        const playButton = stage.querySelector('[data-ear="play"]');
        const questionEl = stage.querySelector('[data-ear="question"]');
        const streakEl = stage.querySelector('[data-ear="streak"]');
        const dots = Array.from(stage.querySelectorAll('.ear-dot'));
        const choices = Array.from(stage.querySelectorAll('.ear-choice'));
        const audioG = stage.querySelector('audio[aria-labelledby="ear-g-label"]');
        const audioD = stage.querySelector('audio[aria-labelledby="ear-d-label"]');
        const audioA = stage.querySelector('audio[aria-labelledby="ear-a-label"]');
        const audioE = stage.querySelector('audio[aria-labelledby="ear-e-label"]');
        const cueBank = createAudioCueBank({
            G: audioG,
            D: audioD,
            A: audioA,
            E: audioE,
        });

        // Initialize Canvas Visualizer
        let canvasEngine = null;
        const canvasEl = stage.querySelector('#ear-trainer-canvas');
        if (canvasEl) {
            canvasEngine = new EarTrainerCanvasEngine(canvasEl, { G: audioG, D: audioD, A: audioA, E: audioE });
        }

        const checklistMap = {
            G: 'et-step-1',
            D: 'et-step-2',
            A: 'et-step-3',
            E: 'et-step-4',
        };
        const rounds = dots.length;

        // Initialize state
        gameState.currentIndex = 0;
        gameState.currentTone = null;
        gameState.correctStreak = 0;
        gameState.correctCount = 0;
        gameState.totalAnswered = 0;
        gameState.lives = 3;
        gameState._rounds = rounds;
        gameState._dots = dots;
        gameState._choices = choices;

        const getLevelForRound = (index) => {
            if (index < 3) return 1; // Rounds 1-3: G, D
            if (index < 6) return 2; // Rounds 4-6: G, D, A
            return 3; // Rounds 7-10: G, D, A, E
        };

        const getTonePoolForLevel = (level) => {
            if (level === 1) return ['G', 'D'];
            if (level === 2) return ['G', 'D', 'A'];
            return ['G', 'D', 'A', 'E'];
        };

        const setActiveDot = () => {
            renderEarTrainerDots({
                dots,
                currentIndex: gameState.currentIndex,
                rounds,
            });
        };

        const setQuestion = (text) => {
            setEarTrainerQuestion(questionEl, text);
        };

        const updateStreak = () => {
            if (streakEl) streakEl.textContent = String(gameState.correctStreak);
        };

        const updateStatsUI = () => {
            if (levelEl) levelEl.textContent = `Level ${getLevelForRound(gameState.currentIndex)}`;
            if (livesEl) livesEl.textContent = '❤️'.repeat(gameState.lives) + '🖤'.repeat(3 - gameState.lives);
        };

        // Store helpers on gameState for onReset
        gameState._setActiveDot = setActiveDot;
        gameState._setQuestion = setQuestion;
        gameState._updateStreak = updateStreak;
        gameState._updateStatsUI = updateStatsUI; // Needed if reset called externally

        setActiveDot();
        updateStatsUI();
        setQuestion(`Question 1 of ${rounds}`);

        const updateSoundState = () => {
            const enabled = isSoundEnabled();
            if (playButton) playButton.disabled = !enabled;
            choices.forEach((choice) => {
                choice.disabled = !enabled;
            });
        };

        gameState._onDeactivate = () => {
            gameState.currentTone = null;
            cueBank.stopAll();
            if (canvasEngine) canvasEngine.stop();
        };

        const executePlayAction = () => {
            if (!isSoundEnabled()) {
                setQuestion('Sounds are off. Turn on Sounds to play.');
                return;
            }
            if (gameState.lives <= 0 || gameState.currentIndex >= rounds) {
                resetSession();
                gameState.lives = 3;
                updateStatsUI();
                setQuestion('New round! Listen and tap the matching note.');
            }
            // Ensure audio context is running when play starts
            if (canvasEngine) canvasEngine.start();

            const currentLevel = getLevelForRound(gameState.currentIndex);
            const tonePool = getTonePoolForLevel(currentLevel);
            gameState.currentTone = tonePool[Math.floor(Math.random() * tonePool.length)];
            cueBank.play(gameState.currentTone);
            const total = rounds || 10;
            setQuestion(`Question ${Math.min(gameState.currentIndex + 1, total)} of ${total} · Tap the matching note.`);
        };

        updateSoundState();

        const soundsHandler = (event) => {
            if (event.detail?.enabled === false) {
                setQuestion('Sounds are off. Turn on Sounds to play.');
                cueBank.stopAll();
            }
            updateSoundState();
        };
        bindSoundsChange(soundsHandler, registerCleanup);

        bindTap(playButton, executePlayAction);
        if (canvasEl) {
            bindTap(canvasEl, executePlayAction);
        }

        choices.forEach((choice) => {
            choice.addEventListener('change', () => {
                if (!gameState.currentTone) {
                    setQuestion('Tap Play to hear the note.');
                    return;
                }
                const selected = choice.dataset.earNote || '';
                const dot = dots[gameState.currentIndex];
                const isCorrect = selected === gameState.currentTone;
                if (dot) {
                    dot.classList.toggle('is-correct', isCorrect);
                    dot.classList.toggle('is-wrong', !isCorrect);
                }
                gameState.totalAnswered += 1;
                if (isCorrect) {
                    gameState.incorrectGuesses = 0;
                    gameState.correctStreak += 1;
                    gameState.correctCount += 1;
                    const checklistId = checklistMap[selected];
                    if (checklistId) markChecklist(checklistId);
                    markChecklistIf(gameState.correctStreak >= 3, 'et-step-5');
                    playToneNote(selected, { duration: 0.22, volume: 0.18, type: 'triangle' });
                } else {
                    gameState.correctStreak = 0;
                    gameState.incorrectGuesses = (gameState.incorrectGuesses || 0) + 1;
                    gameState.lives -= 1;
                    playToneNote('F', { duration: 0.18, volume: 0.14, type: 'sawtooth' });
                }

                if (!isCorrect && gameState.incorrectGuesses >= 2 && gameState.lives > 0) {
                    // Feature: Note Detective Hints
                    const correctChoice = choices.find(c => c.dataset.earNote === gameState.currentTone);
                    if (correctChoice && correctChoice.nextElementSibling) {
                        correctChoice.nextElementSibling.animate([
                            { transform: 'scale(1)', backgroundColor: 'var(--color-surface)' },
                            { transform: 'scale(1.1)', backgroundColor: 'var(--color-primary)' },
                            { transform: 'scale(1)', backgroundColor: 'var(--color-surface)' }
                        ], { duration: 800, iterations: 3 });
                    }
                    cueBank.play(gameState.currentTone);
                    setQuestion(`Hint: It's the ${gameState.currentTone} string! Try again.`);
                    clearEarTrainerChoices(choices);
                    updateStatsUI();
                    reportSession();
                    return; // Do not clear currentTone or advance the round
                }

                gameState.currentTone = null;

                if (gameState.lives <= 0) {
                    setQuestion(`Game Over! Out of lives. Tap Play to try again.`);
                    updateStatsUI();
                    reportSession();
                    return;
                }

                gameState.currentIndex = Math.min(gameState.currentIndex + 1, rounds);
                clearEarTrainerChoices(choices);
                setActiveDot();
                updateStatsUI();

                if (gameState.currentIndex >= rounds) {
                    markChecklist('et-step-6');
                    setQuestion(`Great job! All ${rounds} questions complete. Tap Play to restart.`);
                    reportSession();
                } else {
                    setQuestion(`Question ${gameState.currentIndex + 1} of ${rounds}`);
                }
                updateStreak();
            });
        });

        registerCleanup(() => {
            if (canvasEngine) canvasEngine.destroy();
        });

    },
});

export { updateEarTrainer as update, bind };
