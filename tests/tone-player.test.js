import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { normalizeNote, NOTE_FREQUENCIES, DEFAULT_MAP, createTonePlayer } from '../src/audio/tone-player.js';

describe('NOTE_FREQUENCIES', () => {
    it('contains A4 at 440 Hz', () => {
        expect(NOTE_FREQUENCIES.A4).toBe(440.00);
    });

    it('contains all 14 violin-range notes', () => {
        expect(Object.keys(NOTE_FREQUENCIES)).toHaveLength(14);
    });

    it('has G3 as lowest and E5 as highest', () => {
        expect(NOTE_FREQUENCIES.G3).toBe(196.00);
        expect(NOTE_FREQUENCIES.E5).toBe(659.25);
    });
});

describe('DEFAULT_MAP', () => {
    it('maps bare G to G3 (violin open string)', () => {
        expect(DEFAULT_MAP.G).toBe('G3');
    });

    it('maps bare A to A4 (concert pitch)', () => {
        expect(DEFAULT_MAP.A).toBe('A4');
    });

    it('maps F# to F#4', () => {
        expect(DEFAULT_MAP['F#']).toBe('F#4');
    });
});

describe('normalizeNote', () => {
    it('returns exact match for known note', () => {
        expect(normalizeNote('A4')).toBe('A4');
    });

    it('normalizes lowercase to uppercase', () => {
        expect(normalizeNote('a4')).toBe('A4');
    });

    it('trims whitespace', () => {
        expect(normalizeNote('  G3  ')).toBe('G3');
    });

    it('maps bare string name via DEFAULT_MAP', () => {
        expect(normalizeNote('D')).toBe('D4');
        expect(normalizeNote('e')).toBe('E5');
    });

    it('returns null for unknown note', () => {
        expect(normalizeNote('Z9')).toBeNull();
    });

    it('returns null for empty/falsy input', () => {
        expect(normalizeNote('')).toBeNull();
        expect(normalizeNote(null)).toBeNull();
        expect(normalizeNote(undefined)).toBeNull();
    });

    it('handles F# case-insensitively', () => {
        expect(normalizeNote('f#')).toBe('F#4');
    });
});

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
            resume: vi.fn(async () => {}),
            close: vi.fn(async () => {}),
        };

        globalThis.AudioContext = function () { return mockContext; };
    });

    afterEach(() => {
        delete document.documentElement.dataset.sounds;
        delete globalThis.AudioContext;
        delete globalThis.webkitAudioContext;
    });

    it('returns object with playNote, playSequence, stopAll', () => {
        const player = createTonePlayer();
        expect(player).toBeTruthy();
        expect(typeof player.playNote).toBe('function');
        expect(typeof player.playSequence).toBe('function');
        expect(typeof player.stopAll).toBe('function');
    });

    it('returns null when AudioContext is unavailable', () => {
        delete globalThis.AudioContext;
        delete globalThis.webkitAudioContext;
        const player = createTonePlayer();
        expect(player).toBeNull();
    });

    it('playNote resolves true for valid note', async () => {
        const player = createTonePlayer();
        vi.useFakeTimers();
        const promise = player.playNote('A4');
        await vi.runAllTimersAsync();
        const result = await promise;
        expect(result).toBe(true);
        expect(mockContext.createOscillator).toHaveBeenCalled();
        vi.useRealTimers();
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
        await promise.catch(() => {});
        vi.useRealTimers();
    });
});
