import { describe, expect, it } from 'vitest';
import { isBfcachePagehide } from '../src/utils/lifecycle-utils.js';

describe('lifecycle-utils', () => {
    it('detects persisted bfcache pagehide events', () => {
        expect(isBfcachePagehide({ persisted: true })).toBe(true);
    });

    it('returns false for non-persisted or invalid events', () => {
        expect(isBfcachePagehide({ persisted: false })).toBe(false);
        expect(isBfcachePagehide({})).toBe(false);
        expect(isBfcachePagehide(null)).toBe(false);
        expect(isBfcachePagehide(undefined)).toBe(false);
    });
});
