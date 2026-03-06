import { beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchMocks = vi.hoisted(() => ({
    canPrefetchViews: vi.fn(() => true),
    prefetchViewIfMissing: vi.fn(),
}));

vi.mock('../../src/app/view-prefetch.js', () => prefetchMocks);

import {
    bindHashViewController,
    prefetchLikelyViews,
    setupNavigationController,
} from '../../src/app/navigation-controller.js';

describe('app/navigation-controller', () => {
    beforeEach(() => {
        prefetchMocks.canPrefetchViews.mockReset();
        prefetchMocks.canPrefetchViews.mockReturnValue(true);
        prefetchMocks.prefetchViewIfMissing.mockReset();
        window.location.hash = '#view-home';
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false },
        });
    });

    it('updates nav state and handles hash navigation clicks', () => {
        document.body.innerHTML = `
            <a id="home" href="#view-home"></a>
            <a id="coach" href="#view-coach"></a>
        `;
        const ctx = {
            prefersReducedMotion: () => false,
            navItems: [
                document.getElementById('home'),
                document.getElementById('coach'),
            ],
        };

        setupNavigationController({
            ctx,
            getCurrentViewId: () => 'view-home',
            getActiveNavHref: () => '#view-home',
            isNavItemActive: (itemHref, activeHref) => itemHref === activeHref,
        });

        expect(ctx.navItems[0].classList.contains('is-active')).toBe(true);
        expect(ctx.navItems[1].classList.contains('is-active')).toBe(false);

        ctx.navItems[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(window.location.hash).toBe('#view-coach');
    });

    it('binds hash-based view controller and syncs initial mismatches', async () => {
        const current = { viewId: 'view-home' };
        const showView = vi.fn(async () => {});
        const onAfterViewChange = vi.fn();

        const { syncInitialView } = bindHashViewController({
            getCurrentViewId: () => current.viewId,
            showView,
            onAfterViewChange,
        });

        window.dispatchEvent(new Event('hashchange'));
        await Promise.resolve();
        expect(showView).toHaveBeenCalledWith('view-home');

        current.viewId = 'view-coach';
        await syncInitialView('view-home');
        expect(showView).toHaveBeenCalledWith('view-coach');
        expect(onAfterViewChange).toHaveBeenCalledWith('view-coach');
    });

    it('prefetches likely views on idle when data saver is disabled', () => {
        const queueIdleTask = vi.fn((task) => task());

        prefetchLikelyViews({
            currentViewId: 'view-home',
            prefetchViewIds: ['view-home', 'view-coach', 'view-games'],
            prefetchLimit: 2,
            queueIdleTask,
            getViewPath: (id) => `/views/${id}.html`,
            viewLoader: {},
        });

        expect(prefetchMocks.canPrefetchViews).toHaveBeenCalledTimes(1);
        expect(queueIdleTask).toHaveBeenCalledTimes(2);
        expect(prefetchMocks.prefetchViewIfMissing).toHaveBeenCalledWith({
            viewId: 'view-coach',
            getViewPath: expect.any(Function),
            viewLoader: {},
        });
        expect(prefetchMocks.prefetchViewIfMissing).toHaveBeenCalledWith({
            viewId: 'view-games',
            getViewPath: expect.any(Function),
            viewLoader: {},
        });
    });

    it('skips prefetching when data saver is enabled', () => {
        prefetchMocks.canPrefetchViews.mockReturnValue(false);

        const queueIdleTask = vi.fn();
        prefetchLikelyViews({
            currentViewId: 'view-home',
            prefetchViewIds: ['view-coach'],
            prefetchLimit: 1,
            queueIdleTask,
            getViewPath: (id) => id,
            viewLoader: {},
        });

        expect(prefetchMocks.canPrefetchViews).toHaveBeenCalledTimes(1);
        expect(queueIdleTask).not.toHaveBeenCalled();
        expect(prefetchMocks.prefetchViewIfMissing).not.toHaveBeenCalled();
    });
});
