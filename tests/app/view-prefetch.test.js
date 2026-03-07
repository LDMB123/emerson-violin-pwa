import { describe, expect, it, vi } from 'vitest';
import { canPrefetchViews, prefetchViewIfMissing } from '../../src/app/view-prefetch.js';

const setPrefetchEnvironment = ({ visibilityState = 'visible', saveData = false, reducedData = false } = {}) => {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: visibilityState,
    });
    Object.defineProperty(navigator, 'connection', {
        configurable: true,
        value: { saveData },
    });
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: reducedData && query === '(prefers-reduced-data: reduce)',
    }));
};

describe('app/view-prefetch', () => {
    it('allows prefetch when the page is visible and reduced-data is off', () => {
        setPrefetchEnvironment();

        expect(canPrefetchViews()).toBe(true);
    });

    it('blocks prefetch when navigator saveData is enabled', () => {
        setPrefetchEnvironment({ saveData: true });

        expect(canPrefetchViews()).toBe(false);
    });

    it('blocks prefetch when reduced-data media preference is enabled', () => {
        setPrefetchEnvironment({ reducedData: true });

        expect(canPrefetchViews()).toBe(false);
    });

    it('blocks prefetch while the document is hidden', () => {
        setPrefetchEnvironment({ visibilityState: 'hidden' });

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
