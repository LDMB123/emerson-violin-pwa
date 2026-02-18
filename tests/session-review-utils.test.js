import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayDay } from '../src/utils/math.js';
import {
    starString,
    coachMessageFor,
    buildChart,
    chartCaptionFor,
    filterSongEvents,
    getRecentEvents,
} from '../src/utils/session-review-utils.js';

describe('session-review-utils', () => {
    describe('todayDay', () => {
        let originalNow;

        beforeEach(() => {
            originalNow = Date.now;
            Date.now = vi.fn(() => 86400000 * 100);
        });

        afterEach(() => {
            Date.now = originalNow;
        });

        it('returns day number', () => {
            expect(todayDay()).toBe(100);
        });

        it('changes with Date.now', () => {
            Date.now = vi.fn(() => 86400000 * 150);
            expect(todayDay()).toBe(150);
        });
    });

    describe('starString', () => {
        it('returns 1 star for score 0-19', () => {
            expect(starString(0)).toBe('★☆☆☆☆');
            expect(starString(19)).toBe('★☆☆☆☆');
        });

        it('returns 2 stars for score 20-39', () => {
            expect(starString(30)).toBe('★★☆☆☆');
            expect(starString(39)).toBe('★★☆☆☆');
        });

        it('returns 3 stars for score 40-59', () => {
            expect(starString(50)).toBe('★★★☆☆');
            expect(starString(59)).toBe('★★★☆☆');
        });

        it('returns 4 stars for score 60-79', () => {
            expect(starString(70)).toBe('★★★★☆');
            expect(starString(79)).toBe('★★★★☆');
        });

        it('returns 5 stars for score 80-100', () => {
            expect(starString(90)).toBe('★★★★★');
            expect(starString(100)).toBe('★★★★★');
        });

        it('clamps above 100', () => {
            expect(starString(150)).toBe('★★★★★');
        });
    });

    describe('coachMessageFor', () => {
        it('returns message for pitch', () => {
            expect(coachMessageFor('pitch')).toContain('pitch steady');
        });

        it('returns message for rhythm', () => {
            expect(coachMessageFor('rhythm')).toContain('pulse steady');
        });

        it('returns message for bow_control', () => {
            expect(coachMessageFor('bow_control')).toContain('bow straight');
        });

        it('returns message for posture', () => {
            expect(coachMessageFor('posture')).toContain('Tall spine');
        });

        it('returns message for reading', () => {
            expect(coachMessageFor('reading')).toContain('Slow down');
        });

        it('returns default message for unknown skill', () => {
            expect(coachMessageFor('unknown')).toContain('Nice work');
        });

        it('returns default message for null', () => {
            expect(coachMessageFor(null)).toContain('Nice work');
        });
    });

    describe('buildChart', () => {
        it('returns null for empty values', () => {
            expect(buildChart([])).toBe(null);
        });

        it('builds path and points for single value', () => {
            const result = buildChart([50]);
            expect(result).toBeDefined();
            expect(result.path).toBeDefined();
            expect(result.points).toHaveLength(1);
        });

        it('builds path and points for multiple values', () => {
            const result = buildChart([40, 60, 80]);
            expect(result).toBeDefined();
            expect(result.points).toHaveLength(3);
        });

        it('generates SVG path with M and L commands', () => {
            const result = buildChart([50, 75]);
            expect(result.path).toMatch(/^M[\d.]+ [\d.]+/);
            expect(result.path).toContain(' L');
        });

        it('maps 100 to top of chart', () => {
            const result = buildChart([100]);
            expect(result.points[0].y).toBeLessThan(50);
        });

        it('maps 0 to bottom of chart', () => {
            const result = buildChart([0]);
            expect(result.points[0].y).toBeGreaterThan(130);
        });
    });

    describe('chartCaptionFor', () => {
        it('returns Great job for 80+', () => {
            expect(chartCaptionFor(80)).toBe('Great job!');
            expect(chartCaptionFor(100)).toBe('Great job!');
        });

        it('returns Nice work for 60-79', () => {
            expect(chartCaptionFor(60)).toBe('Nice work!');
            expect(chartCaptionFor(79)).toBe('Nice work!');
        });

        it('returns Keep practicing for below 60', () => {
            expect(chartCaptionFor(59)).toBe('Keep practicing!');
            expect(chartCaptionFor(0)).toBe('Keep practicing!');
        });
    });

    describe('filterSongEvents', () => {
        it('filters song events', () => {
            const events = [
                { type: 'song', id: 1 },
                { type: 'game', id: 2 },
                { type: 'song', id: 3 },
            ];
            const result = filterSongEvents(events);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[1].id).toBe(3);
        });

        it('returns empty for no song events', () => {
            const events = [{ type: 'game' }];
            expect(filterSongEvents(events)).toEqual([]);
        });

        it('returns empty for empty input', () => {
            expect(filterSongEvents([])).toEqual([]);
        });
    });

    describe('getRecentEvents', () => {
        it('returns last 2 events reversed', () => {
            const events = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
            const result = getRecentEvents(events, 2);
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(4);
            expect(result[1].id).toBe(3);
        });

        it('handles fewer events than requested', () => {
            const events = [{ id: 1 }];
            const result = getRecentEvents(events, 2);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(1);
        });

        it('returns empty for empty input', () => {
            expect(getRecentEvents([])).toEqual([]);
        });
    });

});
