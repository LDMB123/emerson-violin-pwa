import {
    cachedEl,
    formatCountdown,
    readLiveNumber,
    setLiveNumber,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
    playToneSequence,
    stopTonePlayer,
} from './shared.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';

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

const bindNoteMemory = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-note-memory');
    if (!stage) return;
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
    let timeLimit = Math.round(45 * difficulty.speed);
    let timeLeft = timeLimit;
    let timerId = null;
    let endTime = null;
    let ended = false;
    let reported = false;
    let paused = false;
    let mismatchTimer = null;

    const updateHud = () => {
        if (matchesEl) {
            matchesEl.dataset.liveMatches = String(matches);
            matchesEl.textContent = `${matches}/${totalPairs}`;
        }
        setLiveNumber(scoreEl, 'liveScore', score);
        if (streakEl) streakEl.textContent = String(matchStreak);
        if (timerEl) timerEl.textContent = formatCountdown(timeLeft);
    };

    const reportResult = attachTuning('note-memory', (tuning) => {
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (!timerId && !ended) {
            timeLeft = timeLimit;
            updateHud();
        }
    });

    const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
        endTime = null;
    };

    const pauseTimer = () => {
        if (!timerId) return;
        if (endTime) {
            timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        }
        stopTimer();
        paused = true;
    };

    const resumeTimer = () => {
        if (!paused || ended) return;
        if (window.location.hash !== '#view-game-note-memory') return;
        if (timeLeft <= 0) return;
        paused = false;
        startTimer();
    };

    const finalizeGame = () => {
        if (reported) return;
        reported = true;
        const accuracy = totalPairs ? (matches / totalPairs) * 100 : 0;
        reportResult({ accuracy, score });
        recordGameEvent('note-memory', { accuracy, score });
    };

    const startTimer = () => {
        if (timerId) return;
        paused = false;
        endTime = Date.now() + timeLeft * 1000;
        timerId = window.setInterval(() => {
            if (!endTime) return;
            timeLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            if (timeLeft <= 0) {
                timeLeft = 0;
                ended = true;
                lock = false;
                stopTimer();
                finalizeGame();
            }
            updateHud();
        }, 300);
    };

    const resetGame = () => {
        stopTimer();
        if (mismatchTimer) {
            clearTimeout(mismatchTimer);
            mismatchTimer = null;
        }
        flipped = [];
        lock = false;
        matches = 0;
        score = 0;
        matchStreak = 0;
        timeLeft = timeLimit;
        ended = false;
        reported = false;
        cards.forEach((card) => {
            card.classList.remove('is-matched');
            const input = card.querySelector('input');
            if (input) {
                input.checked = false;
                input.disabled = false;
            }
        });
        const values = [...noteValues];
        for (let i = values.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        cards.forEach((card, index) => {
            const back = card.querySelector('.memory-back');
            if (back && values[index]) back.textContent = values[index];
        });
        updateHud();
    };

    const noteForCard = (card) => {
        const value = card.querySelector('.memory-back')?.textContent?.trim();
        return value || '';
    };

    const handleMatch = () => {
        const matchedNotes = flipped.map(({ note }) => note).filter(Boolean);
        matches += 1;
        matchStreak += 1;
        score += 120 + matchStreak * 10;
        flipped.forEach(({ card, input }) => {
            card.classList.add('is-matched');
            if (input) input.disabled = true;
        });
        flipped = [];
        lock = false;
        if (matchedNotes.length) {
            playToneSequence(matchedNotes, { tempo: 140, gap: 0.1, duration: 0.22, volume: 0.18, type: 'triangle' });
        }
        if (matches >= totalPairs) {
            ended = true;
            stopTimer();
            finalizeGame();
        }
        updateHud();
    };

    const handleMismatch = () => {
        score = Math.max(0, score - 10);
        matchStreak = 0;
        const current = [...flipped];
        flipped = [];
        if (mismatchTimer) clearTimeout(mismatchTimer);
        mismatchTimer = window.setTimeout(() => {
            current.forEach(({ input }) => {
                if (input) input.checked = false;
            });
            lock = false;
            updateHud();
        }, 600);
    };

    cards.forEach((card) => {
        const input = card.querySelector('input');
        if (!input) return;
        input.addEventListener('change', () => {
            if (!input.checked) return;
            if (lock) {
                input.checked = false;
                return;
            }
            if (ended) {
                resetGame();
                input.checked = false;
                return;
            }
            if (input.disabled) return;
            if (!timerId) startTimer();
            const note = noteForCard(card);
            flipped.push({ card, input, note });
            if (note) {
                playToneNote(note, { duration: 0.24, volume: 0.18, type: 'triangle' });
            }
            if (flipped.length === 2) {
                lock = true;
                if (flipped[0].note && flipped[0].note === flipped[1].note) {
                    handleMatch();
                } else {
                    handleMismatch();
                }
            }
        });
    });

    bindTap(resetButton, () => {
        resetGame();
    });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            stopTonePlayer();
        }
    });

    updateHud();

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-note-memory') {
            resetGame();
            return;
        }
        if (matches > 0 || score > 0) {
            finalizeGame();
        }
        stopTimer();
        if (mismatchTimer) {
            clearTimeout(mismatchTimer);
            mismatchTimer = null;
        }
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseTimer();
        } else {
            resumeTimer();
        }
    });

    if (window.location.hash === '#view-game-note-memory') {
        resetGame();
    }
};

export { updateNoteMemory as update, bindNoteMemory as bind };
