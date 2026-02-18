import { createGame } from './game-shell.js';
import {
    cachedEl,
    markChecklist,
    markChecklistIf,
    bindTap,
    playToneNote,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';

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

let _soundsHandler = null;

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
    onBind: (stage, difficulty, { reportSession, resetSession, gameState }) => {
        const playButton = stage.querySelector('[data-ear="play"]');
        const questionEl = stage.querySelector('[data-ear="question"]');
        const streakEl = stage.querySelector('[data-ear="streak"]');
        const dots = Array.from(stage.querySelectorAll('.ear-dot'));
        const choices = Array.from(stage.querySelectorAll('.ear-choice'));
        const audioG = stage.querySelector('audio[aria-labelledby="ear-g-label"]');
        const audioD = stage.querySelector('audio[aria-labelledby="ear-d-label"]');
        const audioA = stage.querySelector('audio[aria-labelledby="ear-a-label"]');
        const audioE = stage.querySelector('audio[aria-labelledby="ear-e-label"]');
        const audioMap = {
            G: audioG,
            D: audioD,
            A: audioA,
            E: audioE,
        };

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
            dots.forEach((dot, index) => {
                dot.classList.toggle('is-active', index === gameState.currentIndex && index < rounds);
                dot.classList.toggle('is-disabled', index >= rounds);
            });
        };

        const setQuestion = (text) => {
            if (!questionEl) return;
            questionEl.textContent = text;
            questionEl.dataset.live = 'true';
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

        updateSoundState();

        const soundsHandler = (event) => {
            if (event.detail?.enabled === false) {
                setQuestion('Sounds are off. Turn on Sounds to play.');
                Object.values(audioMap).forEach((audio) => {
                    if (audio && !audio.paused) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                });
            }
            updateSoundState();
        };
        if (_soundsHandler) {
            document.removeEventListener(SOUNDS_CHANGE, _soundsHandler);
        }
        _soundsHandler = soundsHandler;
        document.addEventListener(SOUNDS_CHANGE, soundsHandler);

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
            const audio = gameState.currentTone ? audioMap[gameState.currentTone] : null;
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            }
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
                choices.forEach((choiceItem) => {
                    choiceItem.checked = false;
                });
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
