import { GAME_META } from './game-config.js';

const STORAGE_PREFIX = 'panda:difficulty:';
const VALID_LEVELS = ['easy', 'medium', 'hard'];
const MEDIUM_DEFAULT = { speed: 1.0, complexity: 1 };

/**
 * Returns the current difficulty level string for a game.
 * Falls back to 'medium' if not set or corrupt.
 * @param {string} gameId
 * @returns {'easy'|'medium'|'hard'}
 */
export const getCurrentLevel = (gameId) => {
    const raw = localStorage.getItem(STORAGE_PREFIX + gameId);
    return VALID_LEVELS.includes(raw) ? raw : 'medium';
};

/**
 * Returns the resolved difficulty config { speed, complexity } for a game.
 * Falls back to medium defaults if game has no difficulty block or level is unknown.
 * @param {string} gameId
 * @returns {{ speed: number, complexity: number }}
 */
export const getDifficulty = (gameId) => {
    const level = getCurrentLevel(gameId);
    const meta = GAME_META[gameId];
    const config = meta?.difficulty?.[level];
    return config ?? MEDIUM_DEFAULT;
};

/**
 * Saves the chosen difficulty level for a game to localStorage.
 * @param {string} gameId
 * @param {'easy'|'medium'|'hard'} level
 */
export const setDifficulty = (gameId, level) => {
    if (!VALID_LEVELS.includes(level)) return;
    localStorage.setItem(STORAGE_PREFIX + gameId, level);
};
