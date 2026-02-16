import { describe, it, expect } from 'vitest';
import { clamp } from '../src/utils/math.js';

describe('clamp', () => {
    it('should clamp value below min to min', () => {
        expect(clamp(-5, 0, 10)).toBe(0);
        expect(clamp(0, 5, 10)).toBe(5);
    });

    it('should clamp value above max to max', () => {
        expect(clamp(15, 0, 10)).toBe(10);
        expect(clamp(100, 0, 50)).toBe(50);
    });

    it('should return value when in range', () => {
        expect(clamp(5, 0, 10)).toBe(5);
        expect(clamp(7.5, 0, 10)).toBe(7.5);
        expect(clamp(0, 0, 10)).toBe(0);
        expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should handle equal min and max', () => {
        expect(clamp(5, 10, 10)).toBe(10);
        expect(clamp(10, 10, 10)).toBe(10);
        expect(clamp(15, 10, 10)).toBe(10);
    });

    it('should handle negative numbers', () => {
        expect(clamp(-15, -10, -5)).toBe(-10);
        expect(clamp(-3, -10, -5)).toBe(-5);
        expect(clamp(-7, -10, -5)).toBe(-7);
        expect(clamp(-100, -50, 0)).toBe(-50);
        expect(clamp(10, -50, 0)).toBe(0);
    });
});
