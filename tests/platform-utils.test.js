import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    shouldRetryPersist,
    formatBytes,
    isStandalone,
    viewAllowsWake,
    getPreferredOrientation,
} from '../src/platform/platform-utils.js';

describe('shouldRetryPersist', () => {
    it('returns true when state is null', () => {
        expect(shouldRetryPersist(null)).toBe(true);
    });

    it('returns true when state is undefined', () => {
        expect(shouldRetryPersist(undefined)).toBe(true);
    });

    it('returns false when state.persisted is true', () => {
        const state = { persisted: true, lastAttempt: Date.now() };
        expect(shouldRetryPersist(state)).toBe(false);
    });

    it('returns true when lastAttempt is missing', () => {
        const state = { persisted: false };
        expect(shouldRetryPersist(state)).toBe(true);
    });

    it('returns true when lastAttempt is over a week old', () => {
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const state = {
            persisted: false,
            lastAttempt: Date.now() - oneWeek - 1,
        };
        expect(shouldRetryPersist(state)).toBe(true);
    });

    it('returns false when lastAttempt is within a week', () => {
        const state = {
            persisted: false,
            lastAttempt: Date.now() - 1000,
        };
        expect(shouldRetryPersist(state)).toBe(false);
    });

    it('returns false when lastAttempt is exactly one week', () => {
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const state = {
            persisted: false,
            lastAttempt: Date.now() - oneWeek,
        };
        expect(shouldRetryPersist(state)).toBe(false);
    });
});

describe('formatBytes', () => {
    it('formats 0 bytes', () => {
        expect(formatBytes(0)).toBe('0 B');
    });

    it('formats bytes less than 1024', () => {
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(1023)).toBe('1023 B');
    });

    it('formats kilobytes with no decimal for values >= 10', () => {
        expect(formatBytes(10240)).toBe('10 KB');
    });

    it('formats kilobytes with 1 decimal for values < 10', () => {
        expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('formats megabytes with no decimal for values >= 10', () => {
        expect(formatBytes(10485760)).toBe('10 MB');
    });

    it('formats megabytes with 1 decimal for values < 10', () => {
        expect(formatBytes(1572864)).toBe('1.5 MB');
    });

    it('formats gigabytes with no decimal for values >= 10', () => {
        expect(formatBytes(10737418240)).toBe('10 GB');
    });

    it('formats gigabytes with 1 decimal for values < 10', () => {
        expect(formatBytes(1610612736)).toBe('1.5 GB');
    });

    it('returns "0 MB" for non-finite values', () => {
        expect(formatBytes(NaN)).toBe('0 MB');
        expect(formatBytes(Infinity)).toBe('0 MB');
        expect(formatBytes(-Infinity)).toBe('0 MB');
    });

    it('handles exactly 1024 bytes', () => {
        expect(formatBytes(1024)).toBe('1.0 KB');
    });

    it('handles exactly 1 MB', () => {
        expect(formatBytes(1048576)).toBe('1.0 MB');
    });

    it('handles exactly 1 GB', () => {
        expect(formatBytes(1073741824)).toBe('1.0 GB');
    });
});

describe('isStandalone', () => {
    beforeEach(() => {
        // Mock matchMedia
        window.matchMedia = vi.fn((query) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        delete window.navigator.standalone;
    });

    it('returns true when display-mode is standalone', () => {
        window.matchMedia = vi.fn((query) => ({
            matches: query === '(display-mode: standalone)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        expect(isStandalone()).toBe(true);
    });

    it('returns true when display-mode is fullscreen', () => {
        window.matchMedia = vi.fn((query) => ({
            matches: query === '(display-mode: fullscreen)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        expect(isStandalone()).toBe(true);
    });

    it('returns true when navigator.standalone is true (iOS)', () => {
        window.navigator.standalone = true;
        expect(isStandalone()).toBe(true);
    });

    it('returns false when not standalone', () => {
        expect(isStandalone()).toBe(false);
    });
});

describe('viewAllowsWake', () => {
    it('returns true for game views', () => {
        expect(viewAllowsWake('view-game-pitch')).toBe(true);
        expect(viewAllowsWake('view-game-rhythm')).toBe(true);
        expect(viewAllowsWake('view-game-anything')).toBe(true);
    });

    it('returns true for song views', () => {
        expect(viewAllowsWake('view-song-twinkle')).toBe(true);
        expect(viewAllowsWake('view-song-anything')).toBe(true);
    });

    it('returns true for practice views', () => {
        expect(viewAllowsWake('view-coach')).toBe(true);
        expect(viewAllowsWake('view-songs')).toBe(true);
        expect(viewAllowsWake('view-trainer')).toBe(true);
        expect(viewAllowsWake('view-tuner')).toBe(true);
        expect(viewAllowsWake('view-session-review')).toBe(true);
    });

    it('returns false for non-practice views', () => {
        expect(viewAllowsWake('view-home')).toBe(false);
        expect(viewAllowsWake('view-settings')).toBe(false);
        expect(viewAllowsWake('view-about')).toBe(false);
    });
});

describe('getPreferredOrientation', () => {
    beforeEach(() => {
        delete window.screen.orientation;
        window.matchMedia = vi.fn((query) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
    });

    it('returns screen.orientation.type when available', () => {
        window.screen.orientation = { type: 'landscape-secondary' };
        expect(getPreferredOrientation()).toBe('landscape-secondary');
    });

    it('returns "landscape-primary" when in landscape mode without screen.orientation', () => {
        window.matchMedia = vi.fn((query) => ({
            matches: query === '(orientation: landscape)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        expect(getPreferredOrientation()).toBe('landscape-primary');
    });

    it('returns "portrait-primary" when in portrait mode without screen.orientation', () => {
        window.matchMedia = vi.fn((query) => ({
            matches: query === '(orientation: portrait)',
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        expect(getPreferredOrientation()).toBe('portrait-primary');
    });
});
