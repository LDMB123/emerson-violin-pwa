import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adaptiveEngineMocks = vi.hoisted(() => ({
    getGameTuning: vi.fn(async () => ({ targetBpm: 90, difficulty: 'medium' })),
    updateGameResult: vi.fn(async () => { }),
}));

const soundStateMocks = vi.hoisted(() => ({
    isSoundEnabled: vi.fn(() => true),
}));

const sharedMocks = vi.hoisted(() => ({
    setDifficultyBadge: vi.fn(),
}));

const domUtilsMocks = vi.hoisted(() => ({
    setDisabled: vi.fn(),
}));

const tonePlayerMocks = vi.hoisted(() => ({
    createTonePlayer: vi.fn(() => ({
        scheduleTone: vi.fn(),
    })),
}));

const trainerUtilsMocks = vi.hoisted(() => ({
    calculateMetronomeInterval: vi.fn(() => 500),
    clampBpm: vi.fn((value) => value),
    calculateMetronomeAccuracy: vi.fn(() => 90),
}));

const metronomeViewMocks = vi.hoisted(() => ({
    createEmptyMetronomeElements: vi.fn(() => ({})),
    updateMetronomeDisplay: vi.fn(),
    syncMetronomeRunningState: vi.fn(),
}));

const metronomeBindingsMocks = vi.hoisted(() => ({
    bindMetronomeSliderControl: vi.fn(),
    bindMetronomeToggleControl: vi.fn(),
    bindMetronomeTapControl: vi.fn(),
}));

vi.mock('../../src/ml/adaptive-engine.js', () => adaptiveEngineMocks);
vi.mock('../../src/utils/sound-state.js', () => soundStateMocks);
vi.mock('../../src/games/shared.js', () => sharedMocks);
vi.mock('../../src/utils/dom-utils.js', () => domUtilsMocks);
vi.mock('../../src/audio/tone-player.js', () => tonePlayerMocks);
vi.mock('../../src/trainer/trainer-utils.js', () => trainerUtilsMocks);
vi.mock('../../src/trainer/metronome-controller-view.js', () => metronomeViewMocks);
vi.mock('../../src/trainer/metronome-controller-bindings.js', () => metronomeBindingsMocks);

import { createMetronomeController } from '../../src/trainer/metronome-controller.js';

const setVisibility = (value) => {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value,
    });
};

describe('trainer/metronome-controller visibility pause + resume', () => {
    let nextIntervalId;

    beforeEach(() => {
        setVisibility('visible');
        nextIntervalId = 1;
        window.setInterval = vi.fn(() => nextIntervalId++);
        window.clearInterval = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('pauses and resumes the metronome loop with visibility helpers', () => {
        const controller = createMetronomeController();
        controller.bindControls();
        const toggleBindings = metronomeBindingsMocks.bindMetronomeToggleControl.mock.calls[0][0];

        toggleBindings.start();
        expect(window.setInterval).toHaveBeenCalledTimes(1);
        expect(metronomeViewMocks.syncMetronomeRunningState).toHaveBeenLastCalledWith(
            expect.objectContaining({ running: true }),
        );

        setVisibility('hidden');
        expect(controller.pauseForVisibility()).toBe(true);
        expect(window.clearInterval).toHaveBeenCalledWith(1);
        expect(metronomeViewMocks.syncMetronomeRunningState).toHaveBeenLastCalledWith(
            expect.objectContaining({ running: false }),
        );

        setVisibility('visible');
        expect(controller.resumeForVisibility()).toBe(true);
        expect(window.setInterval).toHaveBeenCalledTimes(2);

        controller.stop({ silent: true });
        expect(window.clearInterval).toHaveBeenCalledWith(2);
    });

    it('does not resume if explicitly stopped while hidden', () => {
        const controller = createMetronomeController();
        controller.bindControls();
        const toggleBindings = metronomeBindingsMocks.bindMetronomeToggleControl.mock.calls[0][0];

        toggleBindings.start();
        setVisibility('hidden');
        controller.pauseForVisibility();
        controller.stop({ silent: true });

        setVisibility('visible');
        expect(controller.resumeForVisibility()).toBe(false);
        expect(window.setInterval).toHaveBeenCalledTimes(1);
    });
});
