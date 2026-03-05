import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    LESSON_COMPLETE,
    PRACTICE_STEP_COMPLETED,
    PRACTICE_STEP_STARTED,
} from '../../src/utils/event-names.js';
import { createLessonRunnerActions } from '../../src/coach/lesson-plan-runner-actions.js';

describe('coach/lesson-plan-runner-actions', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = `
            <div id="view-coach">
                <input id="runner-step-1" type="checkbox" />
                <div data-lesson-runner-timer></div>
                <button data-lesson-runner-start type="button">Start</button>
                <button data-lesson-runner-next type="button">Next</button>
                <a data-lesson-runner-cta href="#view-games">Open activity</a>
            </div>
        `;
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    const createHarness = () => {
        const timerEl = document.querySelector('[data-lesson-runner-timer]');
        const startButton = document.querySelector('[data-lesson-runner-start]');
        const nextButton = document.querySelector('[data-lesson-runner-next]');
        const ctaButton = document.querySelector('[data-lesson-runner-cta]');
        const runnerState = {
            steps: [
                {
                    id: 'runner-step-1',
                    label: 'Warmup',
                    minutes: 0.5,
                    cta: 'view-game-pitch-quest',
                    status: 'not_started',
                },
            ],
            currentIndex: 0,
            completedSteps: 0,
            remainingSeconds: 0,
            timerId: null,
            recommendedGameId: 'view-games',
        };
        const setStatus = vi.fn();
        const updateProgress = vi.fn();
        const syncStepList = vi.fn();
        const updateStepDetails = vi.fn();
        const actions = createLessonRunnerActions({
            runnerState,
            controls: {
                timerEl,
                startButton,
                nextButton,
                ctaButton,
            },
            callbacks: {
                setStatus,
                updateProgress,
                syncStepList,
                updateStepDetails,
            },
        });

        return {
            actions,
            runnerState,
            timerEl,
            startButton,
            nextButton,
            ctaButton,
            setStatus,
            updateProgress,
            syncStepList,
            updateStepDetails,
        };
    };

    it('starts and pauses a runner step while updating controls and timer UI', () => {
        const startedSpy = vi.fn();
        document.addEventListener(PRACTICE_STEP_STARTED, startedSpy, { once: true });
        const h = createHarness();

        h.actions.handleStartClick();

        expect(startedSpy).toHaveBeenCalledTimes(1);
        expect(h.runnerState.timerId).not.toBeNull();
        expect(h.runnerState.remainingSeconds).toBe(30);
        expect(h.startButton.textContent).toBe('Pause');
        expect(h.timerEl.textContent).toBe('00:30');
        expect(h.setStatus).toHaveBeenCalledWith('Step in progress.');
        expect(h.syncStepList).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1000);
        expect(h.runnerState.remainingSeconds).toBe(29);
        expect(h.timerEl.textContent).toBe('00:29');

        h.actions.pauseStep();

        expect(h.runnerState.timerId).toBeNull();
        expect(h.startButton.textContent).toBe('Resume');
        expect(h.setStatus).toHaveBeenLastCalledWith('Paused. Tap Resume when ready.');
    });

    it('auto-completes the final step and updates completion UI', () => {
        const completedSpy = vi.fn();
        const lessonCompleteSpy = vi.fn();
        document.addEventListener(PRACTICE_STEP_COMPLETED, completedSpy, { once: true });
        document.addEventListener(LESSON_COMPLETE, lessonCompleteSpy, { once: true });
        const h = createHarness();

        h.actions.handleStartClick();
        vi.advanceTimersByTime(31000);

        expect(completedSpy).toHaveBeenCalledTimes(1);
        expect(lessonCompleteSpy).toHaveBeenCalledTimes(1);
        expect(h.runnerState.timerId).toBeNull();
        expect(h.runnerState.completedSteps).toBe(1);
        expect(h.startButton.textContent).toBe('Restart');
        expect(h.nextButton.disabled).toBe(true);
        expect(h.ctaButton.getAttribute('href')).toBe('#view-games');
        expect(h.setStatus).toHaveBeenLastCalledWith('Lesson complete! Awesome work.');
        expect(h.updateStepDetails).toHaveBeenCalled();
    });
});
