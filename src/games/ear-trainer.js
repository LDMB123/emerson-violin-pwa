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

        // difficulty.speed: visual feedback only for this game (audio files play at fixed speed)
        // difficulty.complexity: narrows the note pool; complexity=1 (medium) = all 4 strings (current behavior)
        const allTones = ['G', 'D', 'A', 'E'];
        const tonePool = difficulty.complexity === 0
            ? ['G', 'D']
            : difficulty.complexity === 2
                ? ['G', 'D', 'A', 'E']
                : allTones;
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
        gameState._rounds = rounds;
        gameState._dots = dots;
        gameState._choices = choices;

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

        // Store helpers on gameState for onReset
        gameState._setActiveDot = setActiveDot;
        gameState._setQuestion = setQuestion;
        gameState._updateStreak = updateStreak;

        setActiveDot();
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

        bindTap(playButton, () => {
            if (!isSoundEnabled()) {
                setQuestion('Sounds are off. Turn on Sounds to play.');
                return;
            }
            if (gameState.currentIndex >= rounds) {
                resetSession();
                setQuestion('New round! Listen and tap the matching note.');
            }
            gameState.currentTone = tonePool[Math.floor(Math.random() * tonePool.length)];
            cueBank.play(gameState.currentTone);
            const total = rounds || 10;
            setQuestion(`Question ${Math.min(gameState.currentIndex + 1, total)} of ${total} · Tap the matching note.`);
        });

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
                    gameState.correctStreak += 1;
                    gameState.correctCount += 1;
                    const checklistId = checklistMap[selected];
                    if (checklistId) markChecklist(checklistId);
                    markChecklistIf(gameState.correctStreak >= 3, 'et-step-5');
                    playToneNote(selected, { duration: 0.22, volume: 0.18, type: 'triangle' });
                } else {
                    gameState.correctStreak = 0;
                    playToneNote('F', { duration: 0.18, volume: 0.14, type: 'sawtooth' });
                }
                gameState.currentTone = null;
                gameState.currentIndex = Math.min(gameState.currentIndex + 1, rounds);
                clearEarTrainerChoices(choices);
                setActiveDot();
                if (gameState.currentIndex >= rounds) {
                    markChecklist('et-step-6');
                    setQuestion(`Great job! All ${rounds} rounds complete. Tap Play to restart.`);
                    reportSession();
                } else {
                    setQuestion(`Question ${gameState.currentIndex + 1} of ${rounds}`);
                }
                updateStreak();
            });
        });

    },
});

export { updateEarTrainer as update, bind };
