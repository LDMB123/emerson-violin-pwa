import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ML_RESET, ML_UPDATE } from '../../src/utils/event-names.js';
import {
    setupModuleImportDomTest,
    teardownModuleImportDomTest,
} from '../utils/test-listener-capture.js';

const adaptiveEngineMocks = vi.hoisted(() => ({
    getGameTuning: vi.fn(async () => ({ tolerance: 12, difficulty: 'easy' })),
    updateGameResult: vi.fn(async () => {}),
}));

const sharedMocks = vi.hoisted(() => ({
    setDifficultyBadge: vi.fn(),
}));

const sessionControllerMocks = vi.hoisted(() => ({
    startSession: vi.fn(async () => ({ active: false, paused: false })),
    stopSession: vi.fn(async () => {}),
    getSessionState: vi.fn(() => ({ active: false, paused: false, lastFeature: null })),
    init: vi.fn(),
}));

const toneControlMocks = vi.hoisted(() => ({
    bindToneButtons: vi.fn(),
}));

vi.mock('../../src/ml/adaptive-engine.js', () => adaptiveEngineMocks);
vi.mock('../../src/games/shared.js', () => sharedMocks);
vi.mock('../../src/realtime/session-controller.js', () => sessionControllerMocks);
vi.mock('../../src/tuner/tuner-tone-controls.js', () => toneControlMocks);

const loadTuner = async () => import('../../src/tuner/tuner.js');

describe('tuner/tuner', () => {
    let moduleTest;

    const flushAsync = async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    };

    beforeEach(() => {
        window.location.hash = '#view-tuner';
        moduleTest = setupModuleImportDomTest({
            html: `
                <section id="tuner-live" class="tuner-card">
                    <div class="tuner-card-header"></div>
                    <div id="tuner-note"></div>
                    <div id="tuner-cents"></div>
                    <div id="tuner-frequency"></div>
                </section>
                <button id="tuner-start" type="button">Start Listening</button>
                <button id="tuner-stop" type="button" disabled>Stop</button>
                <p id="tuner-status"></p>
            `,
        });
    });

    afterEach(() => {
        teardownModuleImportDomTest(moduleTest);
        window.location.hash = '';
    });

    it('refreshes tuning on tuner-specific ML updates and resets', async () => {
        const { init } = await loadTuner();

        init();
        await flushAsync();

        const statusEl = document.querySelector('#tuner-status');
        expect(statusEl?.textContent).toBe('Tap Start Listening (±12¢).');
        expect(adaptiveEngineMocks.getGameTuning).toHaveBeenCalledTimes(1);
        expect(sharedMocks.setDifficultyBadge).toHaveBeenCalledWith(
            document.querySelector('#tuner-live .tuner-card-header'),
            'easy',
        );

        document.dispatchEvent(new CustomEvent(ML_UPDATE, {
            detail: { id: 'trainer-metronome' },
        }));
        await flushAsync();

        expect(statusEl?.textContent).toBe('Tap Start Listening (±12¢).');
        expect(adaptiveEngineMocks.getGameTuning).toHaveBeenCalledTimes(1);

        adaptiveEngineMocks.getGameTuning.mockResolvedValueOnce({ tolerance: 5, difficulty: 'hard' });
        document.dispatchEvent(new CustomEvent(ML_UPDATE, {
            detail: { id: 'tuner' },
        }));
        await flushAsync();

        expect(statusEl?.textContent).toBe('Tap Start Listening (±5¢).');
        expect(adaptiveEngineMocks.getGameTuning).toHaveBeenCalledTimes(2);

        adaptiveEngineMocks.getGameTuning.mockResolvedValueOnce({ tolerance: 3, difficulty: 'medium' });
        document.dispatchEvent(new Event(ML_RESET));
        await flushAsync();

        expect(statusEl?.textContent).toBe('Tap Start Listening (±3¢).');
        expect(adaptiveEngineMocks.getGameTuning).toHaveBeenCalledTimes(3);
    });
});
