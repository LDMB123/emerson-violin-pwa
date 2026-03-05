import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    MISSION_UPDATED,
    ML_RECS,
    ML_RESET,
    ML_UPDATE,
} from '../../src/utils/event-names.js';

const recommendationState = vi.hoisted(() => ({
    payload: {
        skillLabel: 'Bow Control',
        coachCue: 'Keep the bow moving in a straight lane.',
    },
}));

const recommendationMocks = vi.hoisted(() => ({
    getLearningRecommendations: vi.fn(async () => recommendationState.payload),
}));

const pinStateMocks = vi.hoisted(() => ({
    isParentUnlocked: vi.fn(() => true),
}));

vi.mock('../../src/ml/recommendations.js', () => recommendationMocks);
vi.mock('../../src/parent/pin-state.js', () => pinStateMocks);

const loadHomeTeacher = async () => import('../../src/parent/home-teacher.js');

describe('parent/home-teacher', () => {
    const documentListeners = [];
    const windowListeners = [];
    let documentAddSpy;
    let windowAddSpy;

    const flushAsync = async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    };

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.useFakeTimers();
        recommendationState.payload = {
            skillLabel: 'Bow Control',
            coachCue: 'Keep the bow moving in a straight lane.',
        };
        document.body.innerHTML = `
            <section data-parent-home-teacher>
                <h2 data-ht-focus-title></h2>
                <ul data-ht-checklist></ul>
                <button type="button" data-ht-complete>Log Coaching Session</button>
                <p data-ht-status></p>
            </section>
        `;

        const originalDocumentAdd = document.addEventListener.bind(document);
        const originalWindowAdd = window.addEventListener.bind(window);
        documentAddSpy = vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
            documentListeners.push([type, listener, options]);
            return originalDocumentAdd(type, listener, options);
        });
        windowAddSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
            windowListeners.push([type, listener, options]);
            return originalWindowAdd(type, listener, options);
        });
    });

    afterEach(() => {
        documentListeners.splice(0).forEach(([type, listener, options]) => {
            document.removeEventListener(type, listener, options);
        });
        windowListeners.splice(0).forEach(([type, listener, options]) => {
            window.removeEventListener(type, listener, options);
        });
        documentAddSpy?.mockRestore();
        windowAddSpy?.mockRestore();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('refreshes the dashboard for each recommendation event', async () => {
        const { init } = await loadHomeTeacher();

        init();
        vi.advanceTimersByTime(50);
        await flushAsync();

        expect(document.querySelector('[data-ht-focus-title]')?.textContent)
            .toBe("Today's Focus: Bow Control");
        expect(recommendationMocks.getLearningRecommendations).toHaveBeenCalledTimes(1);

        const events = [
            [ML_UPDATE, 'Pitch Accuracy', 'Match each note before moving on.'],
            [ML_RESET, 'Rhythm Precision', 'Count out loud during the clap-back.'],
            [ML_RECS, 'Posture Check', 'Stand tall and let the shoulders stay loose.'],
            [MISSION_UPDATED, 'Bow Grip', 'Keep Bunny Hands soft on the bow stick.'],
        ];

        for (const [eventName, skillLabel, coachCue] of events) {
            recommendationState.payload = { skillLabel, coachCue };
            document.dispatchEvent(new Event(eventName));
            await flushAsync();
            expect(document.querySelector('[data-ht-focus-title]')?.textContent)
                .toBe(`Today's Focus: ${skillLabel}`);
            expect(document.querySelector('[data-ht-checklist]')?.textContent).toContain(coachCue);
        }

        expect(recommendationMocks.getLearningRecommendations).toHaveBeenCalledTimes(5);
    });
});
