import {
    cachedEl,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
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

const bindEarTrainer = () => {
    const stage = document.querySelector('#view-game-ear-trainer');
    if (!stage) return;
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
    const tonePool = ['G', 'D', 'A', 'E'];
    const checklistMap = {
        G: 'et-step-1',
        D: 'et-step-2',
        A: 'et-step-3',
        E: 'et-step-4',
    };

    let currentIndex = 0;
    let currentTone = null;
    let correctStreak = 0;
    let correctCount = 0;
    let totalAnswered = 0;
    let rounds = dots.length;
    let reported = false;

    const setActiveDot = () => {
        dots.forEach((dot, index) => {
            dot.classList.toggle('is-active', index === currentIndex && index < rounds);
            dot.classList.toggle('is-disabled', index >= rounds);
        });
    };

    const applyRounds = (nextRounds) => {
        const resolved = Math.min(dots.length, nextRounds || dots.length);
        rounds = resolved;
        if (currentIndex > rounds) {
            currentIndex = rounds;
        }
        setActiveDot();
    };

    const setQuestion = (text) => {
        if (!questionEl) return;
        questionEl.textContent = text;
        questionEl.dataset.live = 'true';
    };

    const updateStreak = () => {
        if (streakEl) streakEl.textContent = String(correctStreak);
    };

    const reportResult = attachTuning('ear-trainer', (tuning) => {
        applyRounds(tuning.rounds ?? rounds);
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (!totalAnswered && !currentTone) {
            setQuestion(`Question 1 of ${rounds}`);
        }
    });

    setActiveDot();

    const reportSession = () => {
        if (reported || totalAnswered === 0) return;
        reported = true;
        const accuracy = totalAnswered ? (correctCount / totalAnswered) * 100 : 0;
        reportResult({ accuracy, score: correctCount * 10 });
        recordGameEvent('ear-trainer', { accuracy, score: correctCount * 10 });
    };

    const resetTrainer = (message = `Question 1 of ${rounds}`) => {
        currentIndex = 0;
        currentTone = null;
        correctStreak = 0;
        correctCount = 0;
        totalAnswered = 0;
        reported = false;
        dots.forEach((dot) => {
            dot.classList.remove('is-correct', 'is-wrong');
        });
        choices.forEach((choice) => {
            choice.checked = false;
        });
        setActiveDot();
        setQuestion(message);
        updateStreak();
    };

    const updateSoundState = () => {
        const enabled = isSoundEnabled();
        if (playButton) playButton.disabled = !enabled;
        choices.forEach((choice) => {
            choice.disabled = !enabled;
        });
    };

    updateSoundState();

    document.addEventListener(SOUNDS_CHANGE, (event) => {
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
    });

    bindTap(playButton, () => {
        if (!isSoundEnabled()) {
            setQuestion('Sounds are off. Turn on Sounds to play.');
            return;
        }
        if (currentIndex >= rounds) {
            resetTrainer('New round! Listen and tap the matching note.');
        }
        currentTone = tonePool[Math.floor(Math.random() * tonePool.length)];
        const audio = currentTone ? audioMap[currentTone] : null;
        if (audio) {
            if (!isSoundEnabled()) {
                setQuestion('Sounds are off. Turn on Sounds to play.');
                return;
            }
            audio.currentTime = 0;
            if (!isSoundEnabled()) {
                setQuestion('Sounds are off. Turn on Sounds to play.');
                return;
            }
            audio.play().catch(() => {});
        }
        const total = rounds || 10;
        setQuestion(`Question ${Math.min(currentIndex + 1, total)} of ${total} · Tap the matching note.`);
    });

    choices.forEach((choice) => {
        choice.addEventListener('change', () => {
            if (!currentTone) {
                setQuestion('Tap Play to hear the note.');
                return;
            }
            const selected = choice.dataset.earNote || '';
            const dot = dots[currentIndex];
            const isCorrect = selected === currentTone;
            if (dot) {
                dot.classList.toggle('is-correct', isCorrect);
                dot.classList.toggle('is-wrong', !isCorrect);
            }
            totalAnswered += 1;
            if (isCorrect) {
                correctStreak += 1;
                correctCount += 1;
                const checklistId = checklistMap[selected];
                if (checklistId) markChecklist(checklistId);
                markChecklistIf(correctStreak >= 3, 'et-step-5');
                playToneNote(selected, { duration: 0.22, volume: 0.18, type: 'triangle' });
            } else {
                correctStreak = 0;
                playToneNote('F', { duration: 0.18, volume: 0.14, type: 'sawtooth' });
            }
            currentTone = null;
            currentIndex = Math.min(currentIndex + 1, rounds);
            choices.forEach((choiceItem) => {
                choiceItem.checked = false;
            });
            setActiveDot();
            if (currentIndex >= rounds) {
                markChecklist('et-step-6');
                setQuestion(`Great job! All ${rounds} rounds complete. Tap Play to restart.`);
                if (!reported) {
                    reported = true;
                    const accuracy = rounds ? (correctCount / rounds) * 100 : 0;
                    reportResult({ accuracy, score: correctCount * 10 });
                    recordGameEvent('ear-trainer', { accuracy, score: correctCount * 10 });
                }
            } else {
                setQuestion(`Question ${currentIndex + 1} of ${rounds}`);
            }
            updateStreak();
        });
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-ear-trainer') {
            resetTrainer();
            return;
        }
        reportSession();
    }, { passive: true });

    if (window.location.hash === '#view-game-ear-trainer') {
        resetTrainer();
    }
};

export { updateEarTrainer as update, bindEarTrainer as bind };
