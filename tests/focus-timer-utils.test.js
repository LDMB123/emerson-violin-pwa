import { describe, it, expect } from 'vitest';
import { shouldStopFocusTimer } from '../src/coach/focus-timer-utils.js';

describe('shouldStopFocusTimer', () => {
    it('returns false when timer is not active', () => {
        expect(shouldStopFocusTimer({
            isChecked: false,
            isCompleting: false,
            viewId: '#view-coach'
        })).toBe(false);
    });

    it('returns false while completion flow is active', () => {
        expect(shouldStopFocusTimer({
            isChecked: true,
            isCompleting: true,
            viewId: '#view-home'
        })).toBe(false);
    });

    it('returns false for active coach view without force', () => {
        expect(shouldStopFocusTimer({
            isChecked: true,
            isCompleting: false,
            viewId: '#view-coach'
        })).toBe(false);
    });

    it('returns true when navigating away from coach view', () => {
        expect(shouldStopFocusTimer({
            isChecked: true,
            isCompleting: false,
            viewId: '#view-home'
        })).toBe(true);
    });

    it('returns true when forced by lifecycle events', () => {
        expect(shouldStopFocusTimer({
            isChecked: true,
            isCompleting: false,
            viewId: '#view-coach',
            force: true
        })).toBe(true);
    });
});
