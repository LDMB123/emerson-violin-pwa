import {
    formatCountdown,
    setLiveNumber,
} from './shared.js';

/** Renders the Note Memory HUD from the current session state. */
export const renderNoteMemoryHud = ({
    matchesEl,
    scoreEl,
    streakEl,
    timerEl,
    totalPairs,
}, {
    matches,
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
