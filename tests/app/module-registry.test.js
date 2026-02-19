import { describe, it, expect } from 'vitest';
import {
    MODULE_LOADERS,
    EAGER_MODULES,
    IDLE_MODULE_PLAN,
    PREFETCH_VIEW_IDS,
    resolveModulesForView,
} from '../../src/app/module-registry.js';

describe('module-registry', () => {
    it('has loaders for all eager modules', () => {
        EAGER_MODULES.forEach((moduleKey) => {
            expect(typeof MODULE_LOADERS[moduleKey]).toBe('function');
        });
    });

    it('has loaders for all idle modules', () => {
        IDLE_MODULE_PLAN.forEach(([moduleKey]) => {
            expect(typeof MODULE_LOADERS[moduleKey]).toBe('function');
        });
    });

    it('keeps prefetch view IDs unique', () => {
        expect(new Set(PREFETCH_VIEW_IDS).size).toBe(PREFETCH_VIEW_IDS.length);
    });

    it('resolves coach modules', () => {
        expect(resolveModulesForView('view-coach')).toEqual([
            'realtimeSession',
            'missionProgress',
            'curriculumRuntime',
            'coachActions',
            'focusTimer',
            'lessonPlan',
            'recommendationsUi',
        ]);
    });

    it('returns memoized frozen module arrays', () => {
        const first = resolveModulesForView('view-games');
        const second = resolveModulesForView('view-games');
        expect(Object.isFrozen(first)).toBe(true);
        expect(first).toBe(second);
    });

    it('resolves parent view with realtime transparency modules', () => {
        const modules = resolveModulesForView('view-parent');
        expect(modules).toContain('parentPin');
        expect(modules).toContain('realtimeReview');
        expect(modules).toContain('swUpdates');
    });

    it('returns empty array for invalid view', () => {
        expect(resolveModulesForView(undefined)).toEqual([]);
    });
});
