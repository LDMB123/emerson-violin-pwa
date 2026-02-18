import { getCurrentLevel, setDifficulty } from './difficulty.js';

const LEVELS = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Med' },
    { value: 'hard', label: 'Hard' },
];

/**
 * Returns the game ID from a game card element's href.
 * e.g. href="#view-game-pitch-quest" → "pitch-quest"
 * @param {HTMLAnchorElement} card
 * @returns {string|null}
 */
const gameIdFromCard = (card) => {
    const href = card.getAttribute('href') || '';
    const match = href.match(/^#view-game-(.+)$/);
    return match ? match[1] : null;
};

/**
 * Returns the game's display name from the card title element.
 * @param {HTMLElement} card
 * @returns {string}
 */
const gameNameFromCard = (card) => {
    return card.querySelector('.game-title')?.textContent?.trim() ?? 'this game';
};

/**
 * Updates all buttons in a picker to reflect the currently selected level.
 * @param {HTMLElement} picker
 * @param {string} selectedLevel
 */
const syncPickerState = (picker, selectedLevel) => {
    picker.querySelectorAll('.difficulty-btn').forEach((btn) => {
        const active = btn.dataset.level === selectedLevel;
        btn.classList.toggle('is-selected', active);
        btn.setAttribute('aria-pressed', String(active));
    });
};

/**
 * Injects difficulty picker buttons into all .game-card elements on the page.
 * Safe to call multiple times — skips cards that already have a picker.
 */
export const renderDifficultyPickers = () => {
    const cards = document.querySelectorAll('.game-card');
    cards.forEach((card) => {
        // Skip if already injected
        if (card.querySelector('.difficulty-picker')) return;

        const gameId = gameIdFromCard(card);
        if (!gameId) return;

        const gameName = gameNameFromCard(card);
        const currentLevel = getCurrentLevel(gameId);

        const picker = document.createElement('div');
        picker.className = 'difficulty-picker';
        picker.setAttribute('role', 'group');
        picker.setAttribute('aria-label', `Difficulty for ${gameName}`);

        LEVELS.forEach(({ value, label }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'difficulty-btn';
            btn.dataset.level = value;
            btn.dataset.gameId = gameId;
            btn.textContent = label;
            btn.setAttribute('aria-pressed', String(value === currentLevel));
            if (value === currentLevel) btn.classList.add('is-selected');

            btn.addEventListener('click', (e) => {
                // Prevent the click from bubbling to the card link
                e.preventDefault();
                e.stopPropagation();
                setDifficulty(gameId, value);
                syncPickerState(picker, value);
            });

            picker.appendChild(btn);
        });

        card.appendChild(picker);
    });
};
