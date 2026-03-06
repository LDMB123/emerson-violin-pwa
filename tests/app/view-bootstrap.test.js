import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const prefetchMocks = vi.hoisted(() => ({
    canPrefetchViews: vi.fn(() => true),
    prefetchViewIfMissing: vi.fn(),
}));

const onboardingMocks = vi.hoisted(() => ({
    shouldShowOnboarding: vi.fn(async () => false),
}));

vi.mock('../../src/app/view-prefetch.js', () => prefetchMocks);
vi.mock('../../src/onboarding/onboarding-check.js', () => onboardingMocks);

import {
    resolveInitialView,
    seedInlineInitialViewCache,
    warmInitialViews,
} from '../../src/app/view-bootstrap.js';

describe('app/view-bootstrap', () => {
    const setMainContent = (markup, initialViewId) => {
        document.body.innerHTML = `<main id="main-content" data-initial-view-id="${initialViewId || ''}">${markup}</main>`;
    };

    beforeEach(() => {
        prefetchMocks.canPrefetchViews.mockReset();
        prefetchMocks.canPrefetchViews.mockReturnValue(true);
        prefetchMocks.prefetchViewIfMissing.mockReset();
        onboardingMocks.shouldShowOnboarding.mockReset();
        onboardingMocks.shouldShowOnboarding.mockResolvedValue(false);
        window.location.hash = '';
        Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: { saveData: false },
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('seeds inline initial view HTML into the view loader cache', () => {
        setMainContent('<section id="view-home" class="view">Home</section>', 'view-home');
        const viewLoader = { seed: vi.fn() };
        const getViewPath = vi.fn((id) => `/views/${id}.html`);

        seedInlineInitialViewCache({ viewLoader, getViewPath });

        expect(getViewPath).toHaveBeenCalledWith('view-home');
        expect(viewLoader.seed).toHaveBeenCalledWith(
            '/views/view-home.html',
            expect.stringContaining('id="view-home"'),
        );
    });

    it('silently ignores inline seed failures', () => {
        setMainContent('<section id="view-home" class="view">Home</section>', 'view-home');
        const viewLoader = {
            seed: vi.fn(() => {
                throw new Error('seed failed');
            }),
        };

        expect(() => seedInlineInitialViewCache({
            viewLoader,
            getViewPath: (id) => id,
        })).not.toThrow();
    });

    it('skips warming when data saver is enabled', () => {
        prefetchMocks.canPrefetchViews.mockReturnValue(false);

        warmInitialViews({
            getCurrentViewId: () => 'view-home',
            viewLoader: {},
            getViewPath: (id) => id,
        });

        expect(prefetchMocks.canPrefetchViews).toHaveBeenCalledTimes(1);
        expect(prefetchMocks.prefetchViewIfMissing).not.toHaveBeenCalled();
    });

    it('warms the current view when eligible and not already inline-seeded', () => {
        setMainContent('<section id="view-home" class="view">Home</section>', 'view-home');

        warmInitialViews({
            getCurrentViewId: () => 'view-coach',
            viewLoader: {},
            getViewPath: (id) => `/views/${id}.html`,
        });

        expect(prefetchMocks.canPrefetchViews).toHaveBeenCalledTimes(1);
        expect(prefetchMocks.prefetchViewIfMissing).toHaveBeenCalledWith({
            viewId: 'view-coach',
            getViewPath: expect.any(Function),
            viewLoader: {},
        });
    });

    it('resolves onboarding view when no explicit hash is set and onboarding is required', async () => {
        onboardingMocks.shouldShowOnboarding.mockResolvedValue(true);

        await expect(resolveInitialView(() => 'view-home')).resolves.toBe('view-onboarding');
    });

    it('keeps the current view when hash already targets a view route', async () => {
        onboardingMocks.shouldShowOnboarding.mockResolvedValue(true);
        window.location.hash = '#view-song-twinkle';

        await expect(resolveInitialView(() => 'view-song-twinkle')).resolves.toBe('view-song-twinkle');
        expect(onboardingMocks.shouldShowOnboarding).not.toHaveBeenCalled();
    });
});
