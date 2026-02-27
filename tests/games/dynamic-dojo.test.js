import { describe, expect, it } from 'vitest';
import { computeAccuracy } from '../../src/games/dynamic-dojo.js';

describe('dynamic-dojo computeAccuracy', () => {
    it('returns 0 when totalTargets is 0', () => {
        expect(computeAccuracy({ score: 0, totalTargets: 0 })).toBe(0);
    });

    it('returns 0 when totalTargets is undefined', () => {
        expect(computeAccuracy({ score: 5 })).toBe(0);
    });

    it('returns correct percentage for partial completion', () => {
        expect(computeAccuracy({ score: 5, totalTargets: 10 })).toBe(50);
    });

    it('returns 100 for full completion', () => {
        expect(computeAccuracy({ score: 10, totalTargets: 10 })).toBe(100);
    });
});
