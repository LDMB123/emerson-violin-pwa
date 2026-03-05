import { describe, expect, it } from 'vitest';
import {
    COUNTDOWN_TICK_MS,
    toCountdownSeconds,
    toRemainingCountdownSeconds,
} from '../../src/utils/countdown-utils.js';

describe('utils/countdown-utils', () => {
    it('uses a shared half-second countdown tick cadence', () => {
        expect(COUNTDOWN_TICK_MS).toBe(500);
    });

    it('rounds countdown milliseconds up to whole seconds', () => {
        expect(toCountdownSeconds(0)).toBe(0);
        expect(toCountdownSeconds(1)).toBe(1);
        expect(toCountdownSeconds(999)).toBe(1);
        expect(toCountdownSeconds(1001)).toBe(2);
        expect(toCountdownSeconds(-100)).toBe(0);
    });

    it('derives remaining countdown seconds from an end time', () => {
        expect(toRemainingCountdownSeconds(5000, 0)).toBe(5);
        expect(toRemainingCountdownSeconds(5000, 4201)).toBe(1);
        expect(toRemainingCountdownSeconds(5000, 5000)).toBe(0);
        expect(toRemainingCountdownSeconds(5000, 6000)).toBe(0);
    });
});
