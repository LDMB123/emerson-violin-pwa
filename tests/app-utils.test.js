import { describe, it, expect } from 'vitest';
import {
    getViewId,
    isNavItemActive,
} from '../src/utils/app-utils.js';
import { resolveModulesForView } from '../src/app/module-registry.js';

describe('app-utils', () => {
    describe('getViewId', () => {
        it('returns view-home for empty input', () => {
            expect(getViewId('')).toBe('view-home');
            expect(getViewId(null)).toBe('view-home');
            expect(getViewId(undefined)).toBe('view-home');
        });

        it('strips hash and whitespace', () => {
            expect(getViewId('#view-tuner')).toBe('view-tuner');
            expect(getViewId('  #view-games  ')).toBe('view-games');
        });
    });

    describe('resolveModulesForView', () => {
        it('returns coach modules', () => {
            const modules = resolveModulesForView('view-coach');
            expect(modules).toContain('coachActions');
            expect(modules).toContain('focusTimer');
            expect(modules).toContain('lessonPlan');
            expect(modules).toContain('recommendationsUi');
        });

        it('returns parent advanced modules', () => {
            const modules = resolveModulesForView('view-parent');
            expect(modules).toContain('parentPin');
            expect(modules).toContain('parentGoals');
            expect(modules).toContain('parentRecordings');
            expect(modules).toContain('realtimeReview');
            expect(modules).toContain('platform');
            expect(modules).toContain('offlineIntegrity');
            expect(modules).toContain('offlineMode');
            expect(modules).toContain('swUpdates');
            expect(modules).toContain('adaptiveUi');
        });

        it('returns no special modules for settings view', () => {
            expect(resolveModulesForView('view-settings')).toEqual([]);
        });

        it('returns game modules for game views', () => {
            const modules = resolveModulesForView('view-game-pitch-quest');
            expect(modules).toContain('gameMetrics');
            expect(modules).toContain('gameEnhancements');
        });

        it('returns a frozen module list', () => {
            const modules = resolveModulesForView('view-coach');
            expect(Object.isFrozen(modules)).toBe(true);
        });

        it('returns empty modules for invalid view id', () => {
            expect(resolveModulesForView(null)).toEqual([]);
        });
    });

    describe('isNavItemActive', () => {
        it('returns true when hrefs match', () => {
            expect(isNavItemActive('#view-games', '#view-games')).toBe(true);
        });

        it('returns false when hrefs differ or activeHref missing', () => {
            expect(isNavItemActive('#view-home', '#view-coach')).toBe(false);
            expect(isNavItemActive('#view-home', null)).toBe(false);
        });
    });

});
