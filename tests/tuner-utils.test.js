import { describe, expect, it } from 'vitest';
import { formatDifficulty, processTunerMessage } from '../src/tuner/tuner-utils.js';

describe('formatDifficulty', () => {
    it('capitalizes first letter', () => {
        expect(formatDifficulty('easy')).toBe('Easy');
        expect(formatDifficulty('hard')).toBe('Hard');
    });

    it('defaults to Medium for falsy value', () => {
        expect(formatDifficulty(null)).toBe('Medium');
        expect(formatDifficulty('')).toBe('Medium');
        expect(formatDifficulty(undefined)).toBe('Medium');
    });

    it('handles already-capitalized input', () => {
        expect(formatDifficulty('Medium')).toBe('Medium');
    });
});

describe('processTunerMessage', () => {
    const TOL = 8;

    it('returns error status for error messages', () => {
        const result = processTunerMessage({ error: true }, TOL);
        expect(result.status).toBe('Live tuner unavailable on this device.');
        expect(result.reset).toBe(false);
    });

    it('returns ready status', () => {
        const result = processTunerMessage({ ready: true }, TOL);
        expect(result.status).toContain('Listening');
        expect(result.reset).toBe(false);
    });

    it('returns reset for low volume', () => {
        const result = processTunerMessage({ frequency: 440, volume: 0.005 }, TOL);
        expect(result.reset).toBe(true);
        expect(result.status).toContain('play a note');
    });

    it('returns reset for zero frequency', () => {
        const result = processTunerMessage({ frequency: 0, volume: 0.5 }, TOL);
        expect(result.reset).toBe(true);
    });

    it('processes normal detection', () => {
        const result = processTunerMessage({
            frequency: 440.12,
            note: 'A4',
            cents: 3.7,
            volume: 0.5,
            inTune: true,
        }, TOL);
        expect(result.note).toBe('A4');
        expect(result.freq).toBe(440.1);
        expect(result.cents).toBe(4);
        expect(result.centsLabel).toBe('+4 cents');
        expect(result.freqLabel).toBe('440.1 Hz');
        expect(result.inTune).toBe(true);
        expect(result.offset).toBe(4);
        expect(result.status).toContain('In tune');
        expect(result.reset).toBe(false);
    });

    it('clamps offset to +/-50', () => {
        const result = processTunerMessage({
            frequency: 440,
            note: 'A4',
            cents: -80,
            volume: 0.5,
            inTune: false,
        }, TOL);
        expect(result.offset).toBe(-50);
    });

    it('shows "Adjust to center" when out of tune', () => {
        const result = processTunerMessage({
            frequency: 440,
            note: 'A4',
            cents: 20,
            volume: 0.5,
            inTune: false,
        }, TOL);
        expect(result.status).toBe('Adjust to center');
    });

    it('uses "--" when note is falsy', () => {
        const result = processTunerMessage({
            frequency: 440,
            note: null,
            cents: 0,
            volume: 0.5,
            inTune: false,
        }, TOL);
        expect(result.note).toBe('--');
    });

    it('includes tolerance in in-tune status string', () => {
        const result = processTunerMessage({
            frequency: 440,
            note: 'A4',
            cents: 0,
            volume: 0.5,
            inTune: true,
        }, 12);
        expect(result.status).toContain('12');
    });

    it('formats negative cents without plus sign', () => {
        const result = processTunerMessage({
            frequency: 440,
            note: 'A4',
            cents: -15.3,
            volume: 0.5,
            inTune: false,
        }, TOL);
        expect(result.centsLabel).toBe('-15 cents');
    });

    it('formats zero cents without plus sign', () => {
        const result = processTunerMessage({
            frequency: 440,
            note: 'A4',
            cents: 0,
            volume: 0.5,
            inTune: true,
        }, TOL);
        expect(result.centsLabel).toBe('0 cents');
    });
});
