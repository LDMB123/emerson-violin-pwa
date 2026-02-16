import { describe, it, expect } from 'vitest';
import { formatMinutes, formatTime } from '../src/games/session-timer.js';

describe('formatMinutes', () => {
    it('formats 1 minute', () => {
        expect(formatMinutes(1)).toBe('1 min');
    });

    it('formats 5 minutes', () => {
        expect(formatMinutes(5)).toBe('5 min');
    });

    it('formats 60 minutes (1 hour)', () => {
        expect(formatMinutes(60)).toBe('60 min');
    });

    it('formats 90 minutes (1.5 hours)', () => {
        expect(formatMinutes(90)).toBe('90 min');
    });

    it('formats 0 minutes', () => {
        expect(formatMinutes(0)).toBe('1 min');
    });

    it('rounds fractional minutes', () => {
        expect(formatMinutes(2.4)).toBe('2 min');
        expect(formatMinutes(2.6)).toBe('3 min');
    });

    it('handles negative values', () => {
        expect(formatMinutes(-5)).toBe('1 min');
    });
});

describe('formatTime', () => {
    it('formats milliseconds to MM:SS', () => {
        expect(formatTime(0)).toBe('00:00');
        expect(formatTime(1000)).toBe('00:01');
        expect(formatTime(60000)).toBe('01:00');
        expect(formatTime(125000)).toBe('02:05');
    });

    it('pads single digits', () => {
        expect(formatTime(5000)).toBe('00:05');
        expect(formatTime(65000)).toBe('01:05');
    });

    it('handles negative values', () => {
        expect(formatTime(-1000)).toBe('00:00');
    });
});
