import { describe, expect, it, vi } from 'vitest';
import { addMediaQueryListener } from '../src/utils/media-query-listener.js';

describe('addMediaQueryListener', () => {
    it('uses addEventListener when available', () => {
        const mediaQueryList = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
        const handler = vi.fn();

        const cleanup = addMediaQueryListener(mediaQueryList, handler);

        expect(mediaQueryList.addEventListener).toHaveBeenCalledWith('change', handler);
        cleanup();
        expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', handler);
    });

    it('falls back to addListener for legacy Safari media query lists', () => {
        const mediaQueryList = {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        };
        const handler = vi.fn();

        const cleanup = addMediaQueryListener(mediaQueryList, handler);

        expect(mediaQueryList.addListener).toHaveBeenCalledWith(handler);
        cleanup();
        expect(mediaQueryList.removeListener).toHaveBeenCalledWith(handler);
    });

    it('returns a no-op cleanup when the media query list is missing', () => {
        expect(() => addMediaQueryListener(null, vi.fn())()).not.toThrow();
    });
});
