import { describe, expect, it } from 'vitest';
import { todayDay } from '../src/utils/math.js';
import {
    minutesForInput,
    toTrackerTimestamp,
    formatRecentScore,
    coachMessageFor,
    buildRadarPoints,
} from '../src/progress/progress-utils.js';

describe('todayDay', () => {
    it('returns a positive integer', () => {
        const day = todayDay();
        expect(day).toBeGreaterThan(0);
        expect(Number.isInteger(day)).toBe(true);
    });

    it('matches manual calculation', () => {
        const expected = Math.floor(Date.now() / 86400000);
        expect(todayDay()).toBe(expected);
    });
});

describe('minutesForInput', () => {
    it('returns data-minutes attribute when present', () => {
        expect(minutesForInput({ dataset: { minutes: '10' }, id: '' })).toBe(10);
    });

    it('returns 5 for goal-step- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'goal-step-focus-scales' })).toBe(5);
    });

    it('returns 5 for parent-goal- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'parent-goal-1' })).toBe(5);
    });

    it('returns 5 for goal-warmup ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'goal-warmup' })).toBe(5);
    });

    it('returns 5 for bow-set- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'bow-set-1' })).toBe(5);
    });

    it('returns 2 for game step ids (pq-step-)', () => {
        expect(minutesForInput({ dataset: {}, id: 'pq-step-1' })).toBe(2);
    });

    it('returns 2 for rd-set- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'rd-set-2' })).toBe(2);
    });

    it('returns 1 for nm-card- ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'nm-card-3' })).toBe(1);
    });

    it('returns 1 for unknown ids', () => {
        expect(minutesForInput({ dataset: {}, id: 'random-thing' })).toBe(1);
    });

    it('handles null/undefined input gracefully', () => {
        expect(minutesForInput(null)).toBe(1);
        expect(minutesForInput(undefined)).toBe(1);
    });

    it('ignores non-numeric data-minutes', () => {
        expect(minutesForInput({ dataset: { minutes: 'abc' }, id: 'pq-step-1' })).toBe(2);
    });
});

describe('toTrackerTimestamp', () => {
    it('converts numeric value to BigInt', () => {
        const result = toTrackerTimestamp(1000);
        expect(result).toBe(1000n);
    });

    it('converts string number to BigInt', () => {
        const result = toTrackerTimestamp('5000');
        expect(result).toBe(5000n);
    });

    it('returns current time BigInt for non-finite input', () => {
        const before = BigInt(Math.floor(Date.now()));
        const result = toTrackerTimestamp('not-a-number');
        const after = BigInt(Math.floor(Date.now()));
        expect(result).toBeGreaterThanOrEqual(before);
        expect(result).toBeLessThanOrEqual(after);
    });

    it('floors decimal values', () => {
        expect(toTrackerTimestamp(99.9)).toBe(99n);
    });
});

describe('formatRecentScore', () => {
    it('formats accuracy as percentage', () => {
        expect(formatRecentScore({ accuracy: 85.7 })).toBe('86%');
    });

    it('formats stars with star symbol', () => {
        expect(formatRecentScore({ stars: 4 })).toBe('4★');
    });

    it('formats raw score', () => {
        expect(formatRecentScore({ score: 150 })).toBe('Score 150');
    });

    it('prefers accuracy over stars', () => {
        expect(formatRecentScore({ accuracy: 90, stars: 3 })).toBe('90%');
    });

    it('prefers stars over raw score', () => {
        expect(formatRecentScore({ stars: 5, score: 100 })).toBe('5★');
    });

    it('returns "Score 0" for null event', () => {
        expect(formatRecentScore(null)).toBe('Score 0');
    });

    it('returns "Score 0" for empty event', () => {
        expect(formatRecentScore({})).toBe('Score 0');
    });
});

describe('coachMessageFor', () => {
    it('returns pitch message', () => {
        expect(coachMessageFor('pitch')).toContain('pitch');
    });

    it('returns rhythm message', () => {
        expect(coachMessageFor('rhythm')).toContain('rhythm');
    });

    it('returns bow_control message', () => {
        expect(coachMessageFor('bow_control')).toContain('bowing');
    });

    it('returns posture message', () => {
        expect(coachMessageFor('posture')).toContain('posture');
    });

    it('returns reading message', () => {
        expect(coachMessageFor('reading')).toContain('reading');
    });

    it('returns default message for unknown skill', () => {
        expect(coachMessageFor('unknown')).toContain('warm-ups');
    });

    it('returns default for undefined', () => {
        expect(coachMessageFor(undefined)).toContain('warm-ups');
    });
});

describe('buildRadarPoints', () => {
    it('returns 5 points (one per skill)', () => {
        const skills = { pitch: 80, rhythm: 60, bow_control: 70, posture: 50, reading: 90 };
        const points = buildRadarPoints(skills);
        expect(points).toHaveLength(5);
    });

    it('returns correct keys in radar order', () => {
        const skills = { pitch: 50, rhythm: 50, bow_control: 50, posture: 50, reading: 50 };
        const points = buildRadarPoints(skills);
        expect(points.map((p) => p.key)).toEqual(['pitch', 'rhythm', 'bow_control', 'posture', 'reading']);
    });

    it('centers at (100, 100) when all skills are 0', () => {
        const skills = { pitch: 0, rhythm: 0, bow_control: 0, posture: 0, reading: 0 };
        const points = buildRadarPoints(skills);
        points.forEach((p) => {
            expect(Number(p.x)).toBeCloseTo(100, 0);
            expect(Number(p.y)).toBeCloseTo(100, 0);
        });
    });

    it('clamps values above 100', () => {
        const skills = { pitch: 200, rhythm: 50, bow_control: 50, posture: 50, reading: 50 };
        const clamped = buildRadarPoints(skills);
        const normal = buildRadarPoints({ pitch: 100, rhythm: 50, bow_control: 50, posture: 50, reading: 50 });
        expect(clamped[0].x).toBe(normal[0].x);
        expect(clamped[0].y).toBe(normal[0].y);
    });

    it('defaults missing skills to 50', () => {
        const points = buildRadarPoints({});
        expect(points).toHaveLength(5);
        // With default 50, radius should be 40 (80 * 0.5)
        // First point (pitch) at angle -PI/2: x=100, y=100-40=60
        expect(Number(points[0].y)).toBeCloseTo(60, 0);
    });

    it('produces string coordinates with 1 decimal', () => {
        const points = buildRadarPoints({ pitch: 75, rhythm: 75, bow_control: 75, posture: 75, reading: 75 });
        points.forEach((p) => {
            expect(p.x).toMatch(/^\d+\.\d$/);
            expect(p.y).toMatch(/^\d+\.\d$/);
        });
    });
});
