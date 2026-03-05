import { describe, expect, it, afterEach } from 'vitest';
import { isSoundEnabled, isSoundDisabledEvent } from '../src/utils/sound-state.js';

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

describe('isSoundDisabledEvent', () => {
    it('returns true when the sounds-change event disables audio', () => {
        expect(isSoundDisabledEvent({ detail: { enabled: false } })).toBe(true);
    });

    it('returns false for non-disable payloads', () => {
        expect(isSoundDisabledEvent({ detail: { enabled: true } })).toBe(false);
        expect(isSoundDisabledEvent({ detail: {} })).toBe(false);
        expect(isSoundDisabledEvent(null)).toBe(false);
    });
});
