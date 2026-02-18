import { describe, it, expect } from 'vitest';
import {
    PRIMARY_VIEWS,
    getViewId,
    isPrimaryView,
    getModulesForView,
    getActiveNavHref,
    isNavItemActive,
} from '../src/utils/app-utils.js';

describe('app-utils', () => {
    describe('PRIMARY_VIEWS constant', () => {
        it('contains view-home', () => {
            expect(PRIMARY_VIEWS.has('view-home')).toBe(true);
        });

        it('contains view-coach', () => {
            expect(PRIMARY_VIEWS.has('view-coach')).toBe(true);
        });

        it('contains view-games', () => {
            expect(PRIMARY_VIEWS.has('view-games')).toBe(true);
        });

        it('contains view-progress', () => {
            expect(PRIMARY_VIEWS.has('view-progress')).toBe(true);
        });

        it('does not contain view-tuner', () => {
            expect(PRIMARY_VIEWS.has('view-tuner')).toBe(false);
        });
    });

    describe('getViewId', () => {
        it('returns view-home for empty string', () => {
            expect(getViewId('')).toBe('view-home');
        });

        it('returns view-home for null', () => {
            expect(getViewId(null)).toBe('view-home');
        });

        it('returns view-home for undefined', () => {
            expect(getViewId(undefined)).toBe('view-home');
        });

        it('strips # prefix', () => {
            expect(getViewId('#view-tuner')).toBe('view-tuner');
        });

        it('trims whitespace', () => {
            expect(getViewId('  view-tuner  ')).toBe('view-tuner');
        });

        it('handles hash with whitespace', () => {
            expect(getViewId('#  view-tuner  ')).toBe('view-tuner');
        });
    });

    describe('isPrimaryView', () => {
        it('returns true for view-home', () => {
            expect(isPrimaryView('view-home')).toBe(true);
        });

        it('returns true for view-coach', () => {
            expect(isPrimaryView('view-coach')).toBe(true);
        });

        it('returns false for view-tuner', () => {
            expect(isPrimaryView('view-tuner')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isPrimaryView('')).toBe(false);
        });
    });

    describe('getModulesForView', () => {
        it('returns empty array for view-home', () => {
            expect(getModulesForView('view-home')).toEqual([]);
        });

        it('returns tuner module for view-tuner', () => {
            expect(getModulesForView('view-tuner')).toEqual(['tuner']);
        });

        it('returns session review modules', () => {
            const modules = getModulesForView('view-session-review');
            expect(modules).toContain('sessionReview');
            expect(modules).toContain('recordings');
        });

        it('returns song modules', () => {
            const modules = getModulesForView('view-songs');
            expect(modules).toContain('songProgress');
            expect(modules).toContain('songSearch');
            expect(modules).toContain('recordings');
        });

        it('returns coach modules', () => {
            const modules = getModulesForView('view-coach');
            expect(modules).toContain('coachActions');
            expect(modules).toContain('focusTimer');
            expect(modules).toContain('lessonPlan');
            expect(modules).toContain('recommendationsUi');
        });

        it('returns trainer modules', () => {
            const modules = getModulesForView('view-trainer');
            expect(modules).toContain('trainerTools');
        });

        it('returns settings modules', () => {
            const modules = getModulesForView('view-settings');
            expect(modules).toContain('swUpdates');
            expect(modules).toContain('adaptiveUi');
            expect(modules).toContain('offlineMode');
            expect(modules).toContain('reminders');
        });

        it('returns backup module', () => {
            const modules = getModulesForView('view-backup');
            expect(modules).toContain('backupExport');
        });

        it('returns parent modules', () => {
            const modules = getModulesForView('view-parent');
            expect(modules).toContain('parentPin');
            expect(modules).toContain('parentGoals');
            expect(modules).toContain('parentRecordings');
            expect(modules).toContain('reminders');
        });

        it('returns game modules', () => {
            const modules = getModulesForView('view-games');
            expect(modules).toContain('gameMetrics');
            expect(modules).toContain('gameEnhancements');
        });

        it('loads gameComplete for view-game-pitch-quest', () => {
            const modules = getModulesForView('view-game-pitch-quest');
            expect(modules).toContain('gameComplete');
        });

        it('loads gameComplete for view-games', () => {
            const modules = getModulesForView('view-games');
            expect(modules).toContain('gameComplete');
        });

        it('returns progress modules', () => {
            const modules = getModulesForView('view-progress');
            expect(modules).toContain('recommendationsUi');
        });

        it('dedupes module names', () => {
            const modules = getModulesForView('view-game-pitch-quest');
            expect(new Set(modules).size).toBe(modules.length);
        });

        it('returns a frozen module list', () => {
            const modules = getModulesForView('view-coach');
            expect(Object.isFrozen(modules)).toBe(true);
        });

        it('returns empty modules for invalid view id', () => {
            expect(getModulesForView(null)).toEqual([]);
        });
    });

    describe('getActiveNavHref', () => {
        it('returns hash for primary view', () => {
            expect(getActiveNavHref('view-home')).toBe('#view-home');
        });

        it('returns null for non-primary view', () => {
            expect(getActiveNavHref('view-tuner')).toBe(null);
        });
    });

    describe('isNavItemActive', () => {
        it('returns true when hrefs match', () => {
            expect(isNavItemActive('#view-home', '#view-home')).toBe(true);
        });

        it('returns false when hrefs differ', () => {
            expect(isNavItemActive('#view-home', '#view-coach')).toBe(false);
        });

        it('returns false when activeHref is null', () => {
            expect(isNavItemActive('#view-home', null)).toBe(false);
        });
    });
});
