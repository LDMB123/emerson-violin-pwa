import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createTonePlayer } from '../src/audio/tone-player.js';

describe('createTonePlayer', () => {
    let mockOscillator;
    let mockGain;
    let mockContext;

    beforeEach(() => {
        document.documentElement.dataset.sounds = 'on';

        mockOscillator = {
            type: 'sine',
            frequency: { value: 0 },
            connect: vi.fn(function () { return mockGain; }),
            start: vi.fn(),
            stop: vi.fn(),
            disconnect: vi.fn(),
            onended: null,
        };

        mockGain = {
            gain: {
                value: 0,
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
            disconnect: vi.fn(),
        };

        mockContext = {
            state: 'running',
            currentTime: 0,
            destination: {},
            createOscillator: vi.fn(() => mockOscillator),
            createGain: vi.fn(() => mockGain),
            resume: vi.fn(async () => { }),
            close: vi.fn(async () => { }),
        };

        globalThis.AudioContext = function () { return mockContext; };
    });

    afterEach(() => {
        delete document.documentElement.dataset.sounds;
        delete globalThis.AudioContext;
        delete globalThis.webkitAudioContext;
    });

    const playA4WithFakeTimers = async (player) => {
        vi.useFakeTimers();
        const promise = player.playNote('A4');
        await vi.runAllTimersAsync();
        const result = await promise;
        vi.useRealTimers();
        return result;
    };

    it('returns object with playNote, playSequence, scheduleTone, stopAll', () => {
        const player = createTonePlayer();
        expect(player).toBeTruthy();
        expect(typeof player.playNote).toBe('function');
        expect(typeof player.playSequence).toBe('function');
        expect(typeof player.scheduleTone).toBe('function');
        expect(typeof player.stopAll).toBe('function');
    });


    it('playNote resolves true for valid note', async () => {
        const player = createTonePlayer();
        const result = await playA4WithFakeTimers(player);
        expect(result).toBe(true);
        expect(mockContext.createOscillator).toHaveBeenCalled();
    });

    it('playNote returns false for unknown note', async () => {
        const player = createTonePlayer();
        const result = await player.playNote('Z9');
        expect(result).toBe(false);
    });

    it('playNote returns false when sounds disabled', async () => {
        document.documentElement.dataset.sounds = 'off';
        document.dispatchEvent(new CustomEvent('panda:sounds-change'));
        const player = createTonePlayer();
        const result = await player.playNote('A4');
        expect(result).toBe(false);
    });

    it('stopAll clears active oscillators', async () => {
        const player = createTonePlayer();
        vi.useFakeTimers();
        const promise = player.playNote('A4');
        // Flush microtasks so ensureContext + scheduleTone register the oscillator
        await vi.advanceTimersByTimeAsync(0);
        player.stopAll();
        expect(mockOscillator.stop).toHaveBeenCalled();
        await vi.runAllTimersAsync();
        await promise.catch(() => { });
        vi.useRealTimers();
    });

    it('uses webkitAudioContext fallback when AudioContext is unavailable', async () => {
        delete globalThis.AudioContext;
        globalThis.webkitAudioContext = function () { return mockContext; };

        const player = createTonePlayer();
        const result = await playA4WithFakeTimers(player);
        expect(result).toBe(true);
        expect(mockContext.createOscillator).toHaveBeenCalled();
    });
});
