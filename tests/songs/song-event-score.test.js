import { describe, expect, it } from 'vitest';
import { getSongEventScore } from '../../src/songs/song-event-score.js';

describe('songs/song-event-score getSongEventScore', () => {
    it('prefers accuracy when present', () => {
        expect(getSongEventScore({ accuracy: 91, timingAccuracy: 88, score: 75 })).toBe(91);
    });

    it('falls back to timingAccuracy', () => {
        expect(getSongEventScore({ timingAccuracy: 84, score: 70 })).toBe(84);
    });

    it('supports legacy score when enabled', () => {
        expect(getSongEventScore({ score: 79 }, { includeLegacyScore: true })).toBe(79);
    });

    it('returns 0 when no score is available', () => {
        expect(getSongEventScore({})).toBe(0);
    });
});
