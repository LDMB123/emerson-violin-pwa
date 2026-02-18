import { GAME_RECORDED, GAME_PLAY_AGAIN } from '../utils/event-names.js';

const dialog = document.getElementById('game-complete-modal');
const scoreEl = document.getElementById('game-complete-score');
const accuracyEl = document.getElementById('game-complete-accuracy');
const starsEl = document.getElementById('game-complete-stars');
const playAgainBtn = document.getElementById('game-complete-play-again');
const backBtn = document.getElementById('game-complete-back');

if (!dialog) throw new Error('[game-complete] dialog element not found');

const STAR_COUNT = 3;

const renderStars = (stars) => {
    if (!starsEl) return;
    const filled = Number.isFinite(stars) ? Math.max(0, Math.min(STAR_COUNT, Math.round(stars))) : 0;
    const starEls = starsEl.querySelectorAll('.game-complete-star');
    starEls.forEach((el, i) => {
        el.classList.remove('filled', 'empty', 'revealed');
        el.classList.add(i < filled ? 'filled' : 'empty');
        el.textContent = i < filled ? '★' : '☆';
    });
};

const revealStars = () => {
    if (!starsEl) return;
    const starEls = starsEl.querySelectorAll('.game-complete-star');
    starEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i * 180);
    });
};

const populate = (detail) => {
    const { score, accuracy, stars } = detail;
    if (scoreEl) scoreEl.textContent = Number.isFinite(score) ? String(score) : '—';
    if (accuracyEl) accuracyEl.textContent = Number.isFinite(accuracy) ? `${accuracy}%` : '—';
    renderStars(stars);
};

const open = (detail) => {
    if (!dialog) return;
    populate(detail);
    dialog.showModal();
    // Stagger star reveal after modal opens
    requestAnimationFrame(() => revealStars());
};

const close = () => {
    if (!dialog) return;
    dialog.close();
};

// Play Again: deterministically request a reset for the current game view
if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
        close();
        const viewId = window.location.hash?.replace(/^#/, '') || '';
        if (!viewId.startsWith('view-game-')) return;
        document.dispatchEvent(new CustomEvent(GAME_PLAY_AGAIN, { detail: { viewId } }));
    });
}

// Back to Games: close then navigate
if (backBtn) {
    backBtn.addEventListener('click', () => close());
}

// Close on backdrop click
dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
});

// Listen for game recorded
document.addEventListener(GAME_RECORDED, (e) => {
    const detail = e.detail || {};
    const { score, accuracy } = detail;
    // Guard: only show if game produced a meaningful result.
    // First guard: no numeric values at all (e.g. game type with no scoring).
    // Second guard: both explicitly zero means no attempts were made.
    if (!Number.isFinite(score) && !Number.isFinite(accuracy)) return;
    if (score === 0 && accuracy === 0) return;
    open(detail);
});
