import { describe, it, expect } from 'vitest';
import {
    getViewId,
    isPrimaryView,
    getModulesForView,
    getActiveNavHref,
    isNavItemActive,
    isMissionCheckpointView,
    toMissionCheckpointHref,
} from '../src/utils/app-utils.js';

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

    describe('isPrimaryView', () => {
        it('treats child core views as primary', () => {
            expect(isPrimaryView('view-home')).toBe(true);
            expect(isPrimaryView('view-coach')).toBe(true);
            expect(isPrimaryView('view-games')).toBe(true);
            expect(isPrimaryView('view-songs')).toBe(true);
            expect(isPrimaryView('view-progress')).toBe(true);
        });

        it('treats parent view as non-primary', () => {
            expect(isPrimaryView('view-parent')).toBe(false);
        });
    });

    describe('getModulesForView', () => {
        it('returns coach modules', () => {
            const modules = getModulesForView('view-coach');
            expect(modules).toContain('coachActions');
            expect(modules).toContain('focusTimer');
            expect(modules).toContain('lessonPlan');
            expect(modules).toContain('recommendationsUi');
        });

        it('returns parent advanced modules', () => {
            const modules = getModulesForView('view-parent');
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
            expect(getModulesForView('view-settings')).toEqual([]);
        });

        it('returns game modules for game views', () => {
            const modules = getModulesForView('view-game-pitch-quest');
            expect(modules).toContain('gameMetrics');
            expect(modules).toContain('gameEnhancements');
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
        it('maps practice group views to coach nav item', () => {
            expect(getActiveNavHref('view-home')).toBe('#view-coach');
            expect(getActiveNavHref('view-tuner')).toBe('#view-coach');
        });

        it('maps songs and games views to matching nav items', () => {
            expect(getActiveNavHref('view-games')).toBe('#view-games');
            expect(getActiveNavHref('view-song-twinkle')).toBe('#view-songs');
            expect(getActiveNavHref('view-progress')).toBe('#view-coach');
        });

        it('returns null for parent and utility views', () => {
            expect(getActiveNavHref('view-parent')).toBe(null);
            expect(getActiveNavHref('view-help')).toBe(null);
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

    describe('mission checkpoint helpers', () => {
        it('marks child mission views as checkpoints', () => {
            expect(isMissionCheckpointView('view-coach')).toBe(true);
            expect(isMissionCheckpointView('view-tuner')).toBe(true);
            expect(isMissionCheckpointView('view-game-pitch-quest')).toBe(true);
            expect(isMissionCheckpointView('view-song-twinkle')).toBe(true);
        });

        it('excludes non-mission views from checkpoints', () => {
            expect(isMissionCheckpointView('view-home')).toBe(false);
            expect(isMissionCheckpointView('view-parent')).toBe(false);
            expect(isMissionCheckpointView('view-settings')).toBe(false);
        });

        it('returns hash hrefs only for checkpoint views', () => {
            expect(toMissionCheckpointHref('view-game-pitch-quest')).toBe('#view-game-pitch-quest');
            expect(toMissionCheckpointHref('view-parent')).toBeNull();
        });
    });
});
