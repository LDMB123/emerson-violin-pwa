import { describe, expect, it, vi } from 'vitest';
import { canPrefetchViews, prefetchViewIfMissing } from '../../src/app/view-prefetch.js';

describe('app/view-prefetch', () => {
    it('allows prefetch when the page is visible and reduced-data is off', () => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false },
        });
        window.matchMedia = vi.fn().mockReturnValue({ matches: false });

        expect(canPrefetchViews()).toBe(true);
    });

    it('blocks prefetch when navigator saveData is enabled', () => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: true },
        });
        window.matchMedia = vi.fn().mockReturnValue({ matches: false });

        expect(canPrefetchViews()).toBe(false);
    });

    it('blocks prefetch when reduced-data media preference is enabled', () => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false },
        });
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: query === '(prefers-reduced-data: reduce)',
        }));

        expect(canPrefetchViews()).toBe(false);
    });

    it('blocks prefetch while the document is hidden', () => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false },
        });
        window.matchMedia = vi.fn().mockReturnValue({ matches: false });

        expect(canPrefetchViews()).toBe(false);
    });

    it('prefetches when the view path is not cached', () => {
        const getViewPath = vi.fn(() => '/views/home.html');
        const viewLoader = {
            has: vi.fn(() => false),
            prefetch: vi.fn(),
        };

        prefetchViewIfMissing({ viewId: 'view-home', getViewPath, viewLoader });

        expect(getViewPath).toHaveBeenCalledWith('view-home');
        expect(viewLoader.has).toHaveBeenCalledWith('/views/home.html');
        expect(viewLoader.prefetch).toHaveBeenCalledWith('/views/home.html');
    });

    it('does not prefetch when the view path is already cached', () => {
        const getViewPath = vi.fn(() => '/views/home.html');
        const viewLoader = {
            has: vi.fn(() => true),
            prefetch: vi.fn(),
        };

        prefetchViewIfMissing({ viewId: 'view-home', getViewPath, viewLoader });

        expect(viewLoader.prefetch).not.toHaveBeenCalled();
    });
});
