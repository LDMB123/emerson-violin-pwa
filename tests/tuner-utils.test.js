import { describe, expect, it } from 'vitest';
import { formatDifficulty } from '../src/tuner/tuner-utils.js';

describe('formatDifficulty', () => {
    it('capitalizes first letter', () => {
        expect(formatDifficulty('easy')).toBe('Easy');
        expect(formatDifficulty('hard')).toBe('Hard');
    });

    it('defaults to Medium for falsy value', () => {
        expect(formatDifficulty(null)).toBe('Medium');
        expect(formatDifficulty('')).toBe('Medium');
        expect(formatDifficulty(undefined)).toBe('Medium');
    });

    it('handles already-capitalized input', () => {
        expect(formatDifficulty('Medium')).toBe('Medium');
    });
});
