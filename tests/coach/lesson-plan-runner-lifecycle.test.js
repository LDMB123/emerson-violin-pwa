import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupLessonRunnerLifecycle } from '../../src/coach/lesson-plan-runner-lifecycle.js';
import { setDocumentVisibility } from '../utils/test-lifecycle-mocks.js';

describe('coach/lesson-plan-runner-lifecycle', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <ul data-lesson-steps></ul>
            <button data-lesson-runner-start type="button">Pause</button>
        `;
        window.location.hash = '#view-coach';
        setDocumentVisibility('visible');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        window.location.hash = '';
        setDocumentVisibility('visible');
    });

    const createHarness = () => {
        const stepsList = document.querySelector('[data-lesson-steps]');
        const startButton = document.querySelector('[data-lesson-runner-start]');
        const stopTimer = vi.fn();
        const pauseStep = vi.fn();
        const syncStepList = vi.fn();
        const onMlUpdate = vi.fn();
        const onMlReset = vi.fn();
        const onMlRecs = vi.fn();
        const onMissionUpdated = vi.fn();
        const teardown = setupLessonRunnerLifecycle({
            stepsList,
            syncStepList,
            stopTimer,
            pauseStep,
            startButton,
            onMlUpdate,
            onMlReset,
            onMlRecs,
            onMissionUpdated,
        });

        return {
            teardown,
            stopTimer,
            pauseStep,
            startButton,
        };
    };

    it('stops the runner and resets the start label when navigating away', () => {
        const h = createHarness();

        window.location.hash = '#view-games';
        window.dispatchEvent(new Event('hashchange'));

        expect(h.stopTimer).toHaveBeenCalledTimes(1);
        expect(h.startButton.textContent).toBe('Start');

        h.teardown();
    });

    it('pauses the runner when the document becomes hidden', () => {
        const h = createHarness();

        setDocumentVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(h.pauseStep).toHaveBeenCalledTimes(1);

        h.teardown();
    });
});
