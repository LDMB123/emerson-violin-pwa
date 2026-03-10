import { describe, expect, it } from 'vitest';
import { resolveDailyLessonPlan } from './daily-lesson-plan.js';

describe('daily-lesson-plan', () => {
    it('prefers adaptive lesson steps when recommendations exist', () => {
        const plan = resolveDailyLessonPlan({
            coachCue: 'Listen for the ring.',
            lessonSteps: [
                { id: 'pitch', label: 'Pitch focus', minutes: 5, cta: 'view-game-pitch-quest' },
            ],
        }, { childName: 'Emerson' });

        expect(plan.coachCue).toBe('Listen for the ring.');
        expect(plan.steps).toHaveLength(1);
        expect(plan.totalMinutes).toBe(5);
    });

    it('falls back to a fresh-user lesson plan', () => {
        const plan = resolveDailyLessonPlan(null, { childName: 'Emerson' });

        expect(plan.coachCue).toContain("Emerson");
        expect(plan.steps).toHaveLength(5);
        expect(plan.steps.map((step) => step.cta)).toEqual([
            'view-bowing',
            'view-game-ear-trainer',
            'view-game-pitch-quest',
            'view-game-rhythm-dash',
            'view-songs',
        ]);
        expect(plan.totalMinutes).toBeGreaterThan(0);
    });
});
