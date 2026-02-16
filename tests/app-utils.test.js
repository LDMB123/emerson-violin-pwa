import { describe, it, expect } from 'vitest';
import {
    PRIMARY_VIEWS,
    getViewId,
    isPrimaryView,
    normalizeViewHash,
    isViewHash,
    shouldLoadTuner,
    shouldLoadSessionReview,
    shouldLoadSongs,
    shouldLoadCoach,
    shouldLoadTrainer,
    shouldLoadSettings,
    shouldLoadBackup,
    shouldLoadParent,
    shouldLoadGames,
    shouldLoadProgress,
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

    describe('normalizeViewHash', () => {
        it('adds # prefix', () => {
            expect(normalizeViewHash('view-tuner')).toBe('#view-tuner');
        });

        it('preserves existing # prefix', () => {
            expect(normalizeViewHash('#view-tuner')).toBe('#view-tuner');
        });

        it('returns #view-home for empty string', () => {
            expect(normalizeViewHash('')).toBe('#view-home');
        });

        it('returns #view-home for null', () => {
            expect(normalizeViewHash(null)).toBe('#view-home');
        });
    });

    describe('isViewHash', () => {
        it('returns true for #view- prefix', () => {
            expect(isViewHash('#view-tuner')).toBe(true);
        });

        it('returns false for non-view hash', () => {
            expect(isViewHash('#settings')).toBe(false);
        });

        it('returns false for empty string', () => {
            expect(isViewHash('')).toBe(false);
        });

        it('returns false for null', () => {
            expect(isViewHash(null)).toBe(false);
        });
    });

    describe('view detection functions', () => {
        describe('shouldLoadTuner', () => {
            it('returns true for view-tuner', () => {
                expect(shouldLoadTuner('view-tuner')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadTuner('view-home')).toBe(false);
            });
        });

        describe('shouldLoadSessionReview', () => {
            it('returns true for view-session-review', () => {
                expect(shouldLoadSessionReview('view-session-review')).toBe(true);
            });

            it('returns true for view-analysis', () => {
                expect(shouldLoadSessionReview('view-analysis')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadSessionReview('view-home')).toBe(false);
            });
        });

        describe('shouldLoadSongs', () => {
            it('returns true for view-songs', () => {
                expect(shouldLoadSongs('view-songs')).toBe(true);
            });

            it('returns true for view-song- prefix', () => {
                expect(shouldLoadSongs('view-song-123')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadSongs('view-home')).toBe(false);
            });
        });

        describe('shouldLoadCoach', () => {
            it('returns true for view-coach', () => {
                expect(shouldLoadCoach('view-coach')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadCoach('view-home')).toBe(false);
            });
        });

        describe('shouldLoadTrainer', () => {
            it('returns true for view-trainer', () => {
                expect(shouldLoadTrainer('view-trainer')).toBe(true);
            });

            it('returns true for view-bowing', () => {
                expect(shouldLoadTrainer('view-bowing')).toBe(true);
            });

            it('returns true for view-posture', () => {
                expect(shouldLoadTrainer('view-posture')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadTrainer('view-home')).toBe(false);
            });
        });

        describe('shouldLoadSettings', () => {
            it('returns true for view-settings', () => {
                expect(shouldLoadSettings('view-settings')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadSettings('view-home')).toBe(false);
            });
        });

        describe('shouldLoadBackup', () => {
            it('returns true for view-backup', () => {
                expect(shouldLoadBackup('view-backup')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadBackup('view-home')).toBe(false);
            });
        });

        describe('shouldLoadParent', () => {
            it('returns true for view-parent', () => {
                expect(shouldLoadParent('view-parent')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadParent('view-home')).toBe(false);
            });
        });

        describe('shouldLoadGames', () => {
            it('returns true for view-games', () => {
                expect(shouldLoadGames('view-games')).toBe(true);
            });

            it('returns true for view-game- prefix', () => {
                expect(shouldLoadGames('view-game-pitch-quest')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadGames('view-home')).toBe(false);
            });
        });

        describe('shouldLoadProgress', () => {
            it('returns true for view-progress', () => {
                expect(shouldLoadProgress('view-progress')).toBe(true);
            });

            it('returns false for other views', () => {
                expect(shouldLoadProgress('view-home')).toBe(false);
            });
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

        it('returns progress modules', () => {
            const modules = getModulesForView('view-progress');
            expect(modules).toContain('recommendationsUi');
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
