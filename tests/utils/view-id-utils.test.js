import { describe, expect, it } from 'vitest';
import {
    viewIdMatches,
    isWakeEligibleView,
    isPracticeViewId,
} from '../../src/utils/view-id-utils.js';

describe('view-id-utils', () => {
    it('matches configured prefixes', () => {
        expect(viewIdMatches('view-game-pitch', { prefixes: ['view-game-'] })).toBe(true);
        expect(viewIdMatches('view-song-twinkle', { prefixes: ['view-song-'] })).toBe(true);
    });

    it('matches configured exact view ids', () => {
        expect(viewIdMatches('view-trainer', { exact: ['view-trainer', 'view-tuner'] })).toBe(true);
        expect(viewIdMatches('view-home', { exact: ['view-trainer', 'view-tuner'] })).toBe(false);
    });

    it('returns false for non-string values', () => {
        expect(viewIdMatches(null, { prefixes: ['view-game-'] })).toBe(false);
        expect(viewIdMatches(undefined, { exact: ['view-home'] })).toBe(false);
    });

    it('evaluates wake-eligible views', () => {
        expect(isWakeEligibleView('view-game-pitch-quest')).toBe(true);
        expect(isWakeEligibleView('view-song-twinkle')).toBe(true);
        expect(isWakeEligibleView('view-session-review')).toBe(true);
        expect(isWakeEligibleView('view-home')).toBe(false);
    });

    it('evaluates practice views for trainer flows', () => {
        expect(isPracticeViewId('view-game-rhythm-dash')).toBe(true);
        expect(isPracticeViewId('view-song-mary')).toBe(true);
        expect(isPracticeViewId('view-bowing')).toBe(true);
        expect(isPracticeViewId('view-home')).toBe(false);
    });
});
