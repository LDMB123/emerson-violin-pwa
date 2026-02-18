import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock localStorage
const store = {};
const localStorageMock = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Minimal GAME_META mock matching the structure game-config.js will have after Task 2
vi.mock('../src/games/game-config.js', () => ({
    GAME_META: {
        'pitch-quest': {
            skill: 'Pitch',
            difficulty: {
                easy:   { speed: 0.8, complexity: 0 },
                medium: { speed: 1.0, complexity: 1 },
                hard:   { speed: 1.3, complexity: 2 },
            },
        },
        'unknown-game': {
            skill: 'Rhythm',
            // no difficulty block
        },
    },
}));

import { getDifficulty, setDifficulty, getCurrentLevel } from '../src/games/difficulty.js';

describe('difficulty service', () => {
    beforeEach(() => {
        Object.keys(store).forEach((k) => delete store[k]);
    });

    it('returns medium defaults when no localStorage entry', () => {
        const d = getDifficulty('pitch-quest');
        expect(d).toEqual({ speed: 1.0, complexity: 1 });
    });

    it('getCurrentLevel returns medium when no entry', () => {
        expect(getCurrentLevel('pitch-quest')).toBe('medium');
    });

    it('setDifficulty persists to localStorage', () => {
        setDifficulty('pitch-quest', 'hard');
        expect(getCurrentLevel('pitch-quest')).toBe('hard');
    });

    it('getDifficulty returns hard config after setDifficulty', () => {
        setDifficulty('pitch-quest', 'hard');
        expect(getDifficulty('pitch-quest')).toEqual({ speed: 1.3, complexity: 2 });
    });

    it('getDifficulty returns easy config', () => {
        setDifficulty('pitch-quest', 'easy');
        expect(getDifficulty('pitch-quest')).toEqual({ speed: 0.8, complexity: 0 });
    });

    it('falls back to medium on corrupt localStorage value', () => {
        store['panda:difficulty:pitch-quest'] = 'bogus';
        expect(getCurrentLevel('pitch-quest')).toBe('medium');
        expect(getDifficulty('pitch-quest')).toEqual({ speed: 1.0, complexity: 1 });
    });

    it('falls back to medium for unknown game with no difficulty block', () => {
        expect(getDifficulty('unknown-game')).toEqual({ speed: 1.0, complexity: 1 });
    });

    it('falls back to medium for completely unknown game ID', () => {
        expect(getDifficulty('nonexistent')).toEqual({ speed: 1.0, complexity: 1 });
    });

    it('setDifficulty ignores invalid level and does not persist', () => {
        setDifficulty('pitch-quest', 'extreme');
        expect(getCurrentLevel('pitch-quest')).toBe('medium');
    });
});
