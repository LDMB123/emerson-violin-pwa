import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    SKILL_BY_GAME,
    GAME_BY_SKILL,
    SKILL_LABELS,
    recencyWeight,
    weightedAverage,
    computeSkillScores,
    findWeakestSkill,
    computeSongLevel,
    pickDailyCue,
} from '../src/utils/recommendations-utils.js';

describe('recommendations-utils', () => {
    describe('SKILL_BY_GAME constant', () => {
        it('maps pitch-quest to pitch', () => {
            expect(SKILL_BY_GAME['pitch-quest']).toBe('pitch');
        });

        it('maps rhythm-dash to rhythm', () => {
            expect(SKILL_BY_GAME['rhythm-dash']).toBe('rhythm');
        });

        it('maps bow-hero to bow_control', () => {
            expect(SKILL_BY_GAME['bow-hero']).toBe('bow_control');
        });

        it('maps note-memory to reading', () => {
            expect(SKILL_BY_GAME['note-memory']).toBe('reading');
        });
    });

    describe('GAME_BY_SKILL constant', () => {
        it('maps pitch to pitch-quest', () => {
            expect(GAME_BY_SKILL.pitch).toBe('pitch-quest');
        });

        it('maps rhythm to rhythm-dash', () => {
            expect(GAME_BY_SKILL.rhythm).toBe('rhythm-dash');
        });

        it('maps bow_control to bow-hero', () => {
            expect(GAME_BY_SKILL.bow_control).toBe('bow-hero');
        });
    });

    describe('SKILL_LABELS constant', () => {
        it('provides readable labels', () => {
            expect(SKILL_LABELS.pitch).toBe('Pitch');
            expect(SKILL_LABELS.bow_control).toBe('Bowing');
        });
    });

    describe('recencyWeight', () => {
        let originalNow;

        beforeEach(() => {
            originalNow = Date.now;
            Date.now = vi.fn(() => 1000000000);
        });

        afterEach(() => {
            Date.now = originalNow;
        });

        it('returns 1 for missing timestamp', () => {
            expect(recencyWeight(null)).toBe(1);
            expect(recencyWeight(undefined)).toBe(1);
        });

        it('returns 1 for current timestamp', () => {
            expect(recencyWeight(1000000000)).toBe(1);
        });

        it('returns lower weight for older timestamp', () => {
            const oneDayAgo = 1000000000 - 86400000;
            const weight = recencyWeight(oneDayAgo);
            expect(weight).toBeLessThan(1);
            expect(weight).toBeGreaterThan(0.7);
        });

        it('decays exponentially with age', () => {
            const twoDaysAgo = 1000000000 - (2 * 86400000);
            const weight = recencyWeight(twoDaysAgo);
            expect(weight).toBeLessThan(0.6);
        });
    });

    describe('weightedAverage', () => {
        it('returns 0 for empty array', () => {
            const result = weightedAverage([], (x) => x.value, (x) => x.weight);
            expect(result).toBe(0);
        });

        it('calculates weighted average', () => {
            const items = [
                { value: 100, weight: 1 },
                { value: 50, weight: 2 },
            ];
            const result = weightedAverage(items, (x) => x.value, (x) => x.weight);
            expect(result).toBeCloseTo(66.67, 1);
        });

        it('ignores non-finite values', () => {
            const items = [
                { value: 100, weight: 1 },
                { value: NaN, weight: 1 },
                { value: 50, weight: 1 },
            ];
            const result = weightedAverage(items, (x) => x.value, (x) => x.weight);
            expect(result).toBeCloseTo(75, 5);
        });

        it('ignores non-finite weights', () => {
            const items = [
                { value: 100, weight: 1 },
                { value: 80, weight: NaN },
                { value: 50, weight: 1 },
            ];
            const result = weightedAverage(items, (x) => x.value, (x) => x.weight);
            expect(result).toBeCloseTo(75, 5);
        });

        it('returns 0 when all weights are 0', () => {
            const items = [
                { value: 100, weight: 0 },
                { value: 50, weight: 0 },
            ];
            const result = weightedAverage(items, (x) => x.value, (x) => x.weight);
            expect(result).toBe(0);
        });
    });

    describe('computeSkillScores', () => {
        let originalNow;

        beforeEach(() => {
            originalNow = Date.now;
            Date.now = vi.fn(() => 1000000000);
        });

        afterEach(() => {
            Date.now = originalNow;
        });

        it('returns empty object for empty log', () => {
            expect(computeSkillScores([])).toEqual({});
        });

        it('computes skill scores from adaptive log', () => {
            const log = [
                { id: 'pitch-quest', accuracy: 80, timestamp: 1000000000 },
                { id: 'pitch-quest', accuracy: 90, timestamp: 1000000000 },
            ];
            const scores = computeSkillScores(log);
            expect(scores.pitch).toBeCloseTo(85, 1);
        });

        it('uses score when accuracy missing', () => {
            const log = [
                { id: 'rhythm-dash', score: 70, timestamp: 1000000000 },
            ];
            const scores = computeSkillScores(log);
            expect(scores.rhythm).toBeCloseTo(70, 1);
        });

        it('ignores entries with unknown game ID', () => {
            const log = [
                { id: 'unknown-game', accuracy: 80, timestamp: 1000000000 },
            ];
            const scores = computeSkillScores(log);
            expect(scores).toEqual({});
        });

        it('applies recency weighting', () => {
            const log = [
                { id: 'pitch-quest', accuracy: 100, timestamp: 1000000000 - 86400000 * 5 },
                { id: 'pitch-quest', accuracy: 50, timestamp: 1000000000 },
            ];
            const scores = computeSkillScores(log);
            expect(scores.pitch).toBeLessThan(75);
            expect(scores.pitch).toBeGreaterThan(50);
        });

        it('clamps values to 0-100 range', () => {
            const log = [
                { id: 'pitch-quest', accuracy: 150, timestamp: 1000000000 },
            ];
            const scores = computeSkillScores(log);
            expect(scores.pitch).toBe(100);
        });
    });

    describe('findWeakestSkill', () => {
        it('returns pitch as default when all skills missing', () => {
            expect(findWeakestSkill({})).toBe('pitch');
        });

        it('finds skill with lowest score', () => {
            const scores = {
                pitch: 80,
                rhythm: 90,
                bow_control: 70,
                reading: 85,
                posture: 75,
            };
            expect(findWeakestSkill(scores)).toBe('bow_control');
        });

        it('defaults missing skills to 60', () => {
            const scores = {
                pitch: 80,
                rhythm: 90,
            };
            expect(findWeakestSkill(scores)).toBe('bow_control');
        });

        it('handles all skills present', () => {
            const scores = {
                pitch: 85,
                rhythm: 75,
                bow_control: 90,
                reading: 80,
                posture: 70,
            };
            expect(findWeakestSkill(scores)).toBe('posture');
        });
    });

    describe('computeSongLevel', () => {
        let originalNow;

        beforeEach(() => {
            originalNow = Date.now;
            Date.now = vi.fn(() => 1000000000);
        });

        afterEach(() => {
            Date.now = originalNow;
        });

        it('returns beginner for low accuracy', () => {
            const events = [
                { type: 'song', accuracy: 50, timestamp: 1000000000 },
                { type: 'song', accuracy: 60, timestamp: 1000000000 },
            ];
            expect(computeSongLevel(events)).toBe('beginner');
        });

        it('returns intermediate for medium accuracy', () => {
            const events = [
                { type: 'song', accuracy: 70, timestamp: 1000000000 },
                { type: 'song', accuracy: 75, timestamp: 1000000000 },
            ];
            expect(computeSongLevel(events)).toBe('intermediate');
        });

        it('returns advanced for high accuracy', () => {
            const events = [
                { type: 'song', accuracy: 90, timestamp: 1000000000 },
                { type: 'song', accuracy: 95, timestamp: 1000000000 },
            ];
            expect(computeSongLevel(events)).toBe('advanced');
        });

        it('uses last 8 events only', () => {
            const events = Array.from({ length: 12 }, (_, i) => ({
                type: 'song',
                accuracy: i < 4 ? 50 : 90,
                timestamp: 1000000000,
            }));
            expect(computeSongLevel(events)).toBe('advanced');
        });

        it('handles empty events', () => {
            expect(computeSongLevel([])).toBe('beginner');
        });
    });

    describe('pickDailyCue', () => {
        let originalNow;

        beforeEach(() => {
            originalNow = Date.now;
            Date.now = vi.fn(() => 86400000 * 100);
        });

        afterEach(() => {
            Date.now = originalNow;
        });

        it('returns empty string for empty list', () => {
            expect(pickDailyCue([])).toBe('');
        });

        it('returns empty string for non-array', () => {
            expect(pickDailyCue(null)).toBe('');
            expect(pickDailyCue(undefined)).toBe('');
        });

        it('returns single item for single-item list', () => {
            expect(pickDailyCue(['only'])).toBe('only');
        });

        it('rotates through list based on day', () => {
            const list = ['a', 'b', 'c'];
            const result = pickDailyCue(list);
            expect(list).toContain(result);
        });

        it('uses seed to vary selection', () => {
            const list = ['a', 'b', 'c'];
            const result1 = pickDailyCue(list, 0);
            const result2 = pickDailyCue(list, 100);
            expect(list).toContain(result1);
            expect(list).toContain(result2);
        });
    });

});
