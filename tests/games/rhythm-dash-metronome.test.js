import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    installWindowIntervalMocks,
    setDocumentVisibility,
} from '../utils/test-lifecycle-mocks.js';

const rhythmUtilsMocks = vi.hoisted(() => ({
    getMetronomeNote: vi.fn(() => 'A'),
    getMetronomeVolume: vi.fn(() => 0.12),
}));

vi.mock('../../src/utils/rhythm-dash-utils.js', () => rhythmUtilsMocks);

import { createRhythmDashMetronome } from '../../src/games/rhythm-dash/metronome.js';

const createDefaultMetronome = () => createRhythmDashMetronome({
    isEnabled: () => true,
    getPlayer: () => ({ playNote: vi.fn(() => Promise.resolve()) }),
    getBeatInterval: () => 500,
});

describe('games/rhythm-dash/metronome visibility behavior', () => {
    beforeEach(() => {
        setDocumentVisibility('visible');
        installWindowIntervalMocks();
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

        setDocumentVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.clearInterval).toHaveBeenCalledWith(1);

        setDocumentVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.setInterval).toHaveBeenCalledTimes(2);
        expect(player.playNote).toHaveBeenCalledTimes(1);

        metronome.stop();
        expect(window.clearInterval).toHaveBeenCalledWith(2);
    });

    it('defers interval start when launched in a hidden tab', () => {
        const metronome = createDefaultMetronome();

        setDocumentVisibility('hidden');
        metronome.start();
        expect(window.setInterval).not.toHaveBeenCalled();

        setDocumentVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.setInterval).toHaveBeenCalledTimes(1);
    });

    it('does not resume if explicitly stopped while hidden', () => {
        const metronome = createDefaultMetronome();

        setDocumentVisibility('hidden');
        metronome.start();
        metronome.stop();

        setDocumentVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(window.setInterval).not.toHaveBeenCalled();
    });
});
