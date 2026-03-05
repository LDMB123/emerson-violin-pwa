import { describe, expect, it, vi } from 'vitest';
import { prefetchViewIfMissing } from '../../src/app/view-prefetch.js';

describe('app/view-prefetch', () => {
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
