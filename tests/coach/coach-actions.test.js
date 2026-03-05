import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    MISSION_UPDATED,
    ML_UPDATE,
} from '../../src/utils/event-names.js';
import {
    setupModuleImportDomTest,
    teardownModuleImportDomTest,
} from '../utils/test-listener-capture.js';

const recommendationState = vi.hoisted(() => ({
    payload: {
        coachCue: 'Keep the bow moving with steady speed.',
    },
}));

const recommendationMocks = vi.hoisted(() => ({
    getLearningRecommendations: vi.fn(async () => recommendationState.payload),
}));

const speechMocks = vi.hoisted(() => ({
    speakVoiceCoachMessage: vi.fn(() => true),
}));

const speechUtilsMocks = vi.hoisted(() => ({
    cancelSpeech: vi.fn(),
}));

vi.mock('../../src/ml/recommendations.js', () => recommendationMocks);
vi.mock('../../src/utils/voice-coach-speech.js', () => speechMocks);
vi.mock('../../src/utils/speech-utils.js', () => speechUtilsMocks);

const loadCoachActions = async () => import('../../src/coach/coach-actions.js');

describe('coach/coach-actions', () => {
    let moduleTest;

    const flushAsync = async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    };

    beforeEach(() => {
        moduleTest = setupModuleImportDomTest({
            html: `
                <div data-progress="coach-speech" class="coach-speech-bubble" data-coach-auto="true">
                    <span class="coach-bubble-text">Ready</span>
                </div>
            `,
            setupState: () => {
                recommendationState.payload = {
                    coachCue: 'Keep the bow moving with steady speed.',
                };
            },
        });
    });

    afterEach(() => {
        teardownModuleImportDomTest(moduleTest);
    });

    it('updates the coach bubble from recommendation and mission document events', async () => {
        const { init } = await loadCoachActions();

        init();
        await flushAsync();
        vi.advanceTimersByTime(600);

        recommendationState.payload = {
            coachCue: 'Listen for the string ringing clearly.',
        };
        document.dispatchEvent(new Event(ML_UPDATE));
        await flushAsync();
        vi.advanceTimersByTime(600);

        expect(document.querySelector('.coach-bubble-text')?.textContent)
            .toBe('Listen for the string ringing clearly.');

        document.dispatchEvent(new CustomEvent(MISSION_UPDATED, {
            detail: {
                mission: {
                    currentStepId: 'step-1',
                    steps: [
                        { id: 'step-1', label: 'Bow lane check', source: 'remediation' },
                    ],
                },
            },
        }));
        vi.advanceTimersByTime(600);

        expect(document.querySelector('.coach-bubble-text')?.textContent)
            .toBe('Remediation step: Bow lane check.');
        expect(speechMocks.speakVoiceCoachMessage).not.toHaveBeenCalled();
    });
});
