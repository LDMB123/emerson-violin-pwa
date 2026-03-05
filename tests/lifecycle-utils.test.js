import { describe, expect, it } from 'vitest';
import { isBfcachePagehide } from '../src/utils/lifecycle-utils.js';

describe('lifecycle-utils', () => {
    it('detects persisted bfcache pagehide events', () => {
        expect(isBfcachePagehide({ persisted: true })).toBe(true);
    });

    it('returns false for non-persisted or invalid events', () => {
        const nonPersistedEvents = [{ persisted: false }, {}, null, undefined];
        nonPersistedEvents.forEach((event) => {
            expect(isBfcachePagehide(event)).toBe(false);
        });
    });
});
