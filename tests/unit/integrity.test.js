import { computeIntegrityChecksum } from '@core/persistence/integrity.js';

describe('computeIntegrityChecksum', () => {
    it('returns stable checksums for the same value', () => {
        const value = { a: 1, b: 2 };
        const first = computeIntegrityChecksum(value);
        const second = computeIntegrityChecksum(value);
        expect(first).toBe(second);
    });

    it('returns different checksums for different values', () => {
        const first = computeIntegrityChecksum({ a: 1 });
        const second = computeIntegrityChecksum({ a: 2 });
        expect(first).not.toBe(second);
    });

    it('handles circular values without throwing', () => {
        const value = {};
        value.self = value;
        const checksum = computeIntegrityChecksum(value);
        expect(checksum).toMatch(/^[0-9a-f]{8}$/);
    });
});
