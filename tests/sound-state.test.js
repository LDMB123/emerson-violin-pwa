import { describe, expect, it, afterEach } from 'vitest';
import { isSoundEnabled } from '../src/utils/sound-state.js';

describe('isSoundEnabled', () => {
    afterEach(() => {
        delete document.documentElement.dataset.sounds;
    });

    it('returns true when data-sounds is absent', () => {
        delete document.documentElement.dataset.sounds;
        expect(isSoundEnabled()).toBe(true);
    });

    it('returns true when data-sounds is "on"', () => {
        document.documentElement.dataset.sounds = 'on';
        expect(isSoundEnabled()).toBe(true);
    });

    it('returns false when data-sounds is "off"', () => {
        document.documentElement.dataset.sounds = 'off';
        expect(isSoundEnabled()).toBe(false);
    });

    it('returns true for any non-"off" value', () => {
        document.documentElement.dataset.sounds = 'yes';
        expect(isSoundEnabled()).toBe(true);
    });
});
