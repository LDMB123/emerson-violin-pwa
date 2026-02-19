import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    MISSION_UPDATED,
    PRACTICE_STEP_COMPLETED,
    PRACTICE_STEP_STARTED,
} from '../../src/utils/event-names.js';

const recommendationState = vi.hoisted(() => ({
    payload: {
        recommendedGameId: 'pitch-quest',
        lessonSteps: [
            { id: 'lesson-1', label: 'Warmup', minutes: 1, cta: 'view-game-pitch-quest' },
            { id: 'lesson-2', label: 'Song', minutes: 1, cta: 'view-songs' },
        ],
        mission: {
            id: 'mission-1',
            currentStepId: 'mission-step-1',
            steps: [
                { id: 'mission-step-1', label: 'Mission warmup', minutes: 1, cta: 'view-game-pitch-quest', status: 'not_started' },
                { id: 'mission-step-2', label: 'Mission song', minutes: 1, cta: 'view-songs', status: 'not_started' },
            ],
        },
    },
}));

const recommendationMocks = vi.hoisted(() => ({
    getLearningRecommendations: vi.fn(async () => recommendationState.payload),
}));

vi.mock('../../src/ml/recommendations.js', () => recommendationMocks);

import { init as initLessonPlan } from '../../src/coach/lesson-plan.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('coach/lesson-plan v2', () => {
    beforeEach(() => {
        recommendationMocks.getLearningRecommendations.mockClear();
        document.body.innerHTML = `
            <section data-lesson-plan="coach">
                <ul data-lesson-steps></ul>
                <a data-lesson="cta" href="#view-games">Start</a>
            </section>
        `;
    });

    it('starts and completes mission steps with practice events', async () => {
        const startedSpy = vi.fn();
        const completedSpy = vi.fn();
        document.addEventListener(PRACTICE_STEP_STARTED, startedSpy);
        document.addEventListener(PRACTICE_STEP_COMPLETED, completedSpy);

        initLessonPlan();
        await flush();

        const startBtn = document.querySelector('[data-lesson-runner-start]');
        const nextBtn = document.querySelector('[data-lesson-runner-next]');
        expect(startBtn).toBeTruthy();
        expect(nextBtn).toBeTruthy();

        startBtn.click();
        expect(startedSpy).toHaveBeenCalledTimes(1);

        nextBtn.click();
        expect(completedSpy).toHaveBeenCalledTimes(1);

        document.removeEventListener(PRACTICE_STEP_STARTED, startedSpy);
        document.removeEventListener(PRACTICE_STEP_COMPLETED, completedSpy);
    });

    it('updates runner when mission changes', async () => {
        initLessonPlan();
        await flush();

        document.dispatchEvent(new CustomEvent(MISSION_UPDATED, {
            detail: {
                mission: {
                    id: 'mission-2',
                    currentStepId: 'step-updated',
                    steps: [
                        {
                            id: 'step-updated',
                            label: 'Updated mission step',
                            minutes: 1,
                            cta: 'view-game-rhythm-dash',
                            status: 'in_progress',
                        },
                    ],
                },
            },
        }));

        await flush();
        const cue = document.querySelector('[data-lesson-runner-cue]');
        expect(cue?.textContent).toContain('Updated mission step');
    });
});
