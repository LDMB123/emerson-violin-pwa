import { describe, expect, it, vi } from 'vitest';
import { isBfcachePagehide, bindHiddenAndPagehide } from '../src/utils/lifecycle-utils.js';

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

    it('binds visibilitychange and pagehide handlers', () => {
        const onHidden = vi.fn();
        const onPagehide = vi.fn();
        const { hiddenHandler, pagehideHandler } = bindHiddenAndPagehide({ onHidden, onPagehide });

        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        expect(onHidden).toHaveBeenCalledTimes(1);

        const nonPersistedPagehide = new Event('pagehide');
        Object.defineProperty(nonPersistedPagehide, 'persisted', { value: false });
        window.dispatchEvent(nonPersistedPagehide);
        expect(onPagehide).toHaveBeenCalledTimes(1);

        const persistedPagehide = new Event('pagehide');
        Object.defineProperty(persistedPagehide, 'persisted', { value: true });
        window.dispatchEvent(persistedPagehide);
        expect(onPagehide).toHaveBeenCalledTimes(1);

        document.removeEventListener('visibilitychange', hiddenHandler);
        window.removeEventListener('pagehide', pagehideHandler);
    });
});
