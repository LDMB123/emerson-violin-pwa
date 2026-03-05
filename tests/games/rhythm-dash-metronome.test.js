import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rhythmUtilsMocks = vi.hoisted(() => ({
    getMetronomeNote: vi.fn(() => 'A'),
    getMetronomeVolume: vi.fn(() => 0.12),
}));

vi.mock('../../src/utils/rhythm-dash-utils.js', () => rhythmUtilsMocks);

import { createRhythmDashMetronome } from '../../src/games/rhythm-dash/metronome.js';

const setVisibility = (value) => {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value,
    });
};

describe('games/rhythm-dash/metronome visibility behavior', () => {
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

    it('pauses active interval on hide and resumes on visible', () => {
        const player = {
            playNote: vi.fn(() => Promise.resolve()),
        };
        const metronome = createRhythmDashMetronome({
            isEnabled: () => true,
            getPlayer: () => player,
            getBeatInterval: () => 120,
        });

        metronome.start();
        expect(window.setInterval).toHaveBeenCalledTimes(1);
        expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 240);
        expect(player.playNote).toHaveBeenCalledTimes(1);

        setVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.clearInterval).toHaveBeenCalledWith(1);

        setVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.setInterval).toHaveBeenCalledTimes(2);
        expect(player.playNote).toHaveBeenCalledTimes(1);

        metronome.stop();
        expect(window.clearInterval).toHaveBeenCalledWith(2);
    });

    it('defers interval start when launched in a hidden tab', () => {
        const metronome = createRhythmDashMetronome({
            isEnabled: () => true,
            getPlayer: () => ({ playNote: vi.fn(() => Promise.resolve()) }),
            getBeatInterval: () => 500,
        });

        setVisibility('hidden');
        metronome.start();
        expect(window.setInterval).not.toHaveBeenCalled();

        setVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.setInterval).toHaveBeenCalledTimes(1);
    });

    it('does not resume if explicitly stopped while hidden', () => {
        const metronome = createRhythmDashMetronome({
            isEnabled: () => true,
            getPlayer: () => ({ playNote: vi.fn(() => Promise.resolve()) }),
            getBeatInterval: () => 500,
        });

        setVisibility('hidden');
        metronome.start();
        metronome.stop();

        setVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.setInterval).not.toHaveBeenCalled();
    });
});
