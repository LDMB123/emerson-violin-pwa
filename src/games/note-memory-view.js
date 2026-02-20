import {
    formatCountdown,
    setLiveNumber,
} from './shared.js';

export const renderNoteMemoryHud = ({
    matchesEl,
    scoreEl,
    streakEl,
    timerEl,
    matches,
    totalPairs,
    score,
    matchStreak,
    timeLeft,
}) => {
    if (matchesEl) {
        matchesEl.dataset.liveMatches = String(matches);
        matchesEl.textContent = `${matches}/${totalPairs}`;
    }
    setLiveNumber(scoreEl, 'liveScore', score);
    if (streakEl) streakEl.textContent = String(matchStreak);
    if (timerEl) timerEl.textContent = formatCountdown(timeLeft);
};
