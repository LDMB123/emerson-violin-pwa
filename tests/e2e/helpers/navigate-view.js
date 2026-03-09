import { expect } from '@playwright/test';

const normalizeViewId = (view) => {
    if (!view) return 'view-home';
    const raw = String(view).replace(/^#/, '');
    return raw.startsWith('view-') ? raw : `view-${raw}`;
};

const isViewVisible = async (page, viewId) => {
    return page.locator(`#${viewId}`).isVisible().catch(() => false);
};

export const navigateToPath = async (page, pathname, { timeout = 10000 } = {}) => {
    const route = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const expectedUrl = new URL(route, 'http://panda.local');

    // Use native Playwright goto with commit synchronization to wait for React's event loop
    await page.goto(route, { waitUntil: 'commit' }).catch(() => { });
    await expect.poll(() => {
        const current = new URL(page.url());
        return `${current.pathname}${current.search}`;
    }, { timeout }).toBe(`${expectedUrl.pathname}${expectedUrl.search}`);
};

export const navigateToView = async (page, view, { timeout = 10000 } = {}) => {
    const viewId = normalizeViewId(view);
    const routeMap = {
        'view-home': '/home',
        'view-coach': '/coach',
        'view-games': '/games',
        'view-trainer': '/tools',
        'view-tuner': '/tools/tuner',
        'view-metronome': '/tools/metronome',
        'view-drone': '/tools/drone',
        'view-bowing': '/tools/bowing',
        'view-posture': '/tools/posture',
        'view-songs': '/songs',
        'view-progress': '/wins',
        'view-parent': '/parent',
        'view-analysis': '/parent/review',
        'view-settings': '/settings',
        'view-help': '/support/help',
        'view-about': '/support/about',
        'view-privacy': '/support/privacy',
        'view-backup': '/parent/data',
        'view-onboarding': '/onboarding',
    };
    const route = routeMap[viewId]
        || (viewId.startsWith('view-game-') ? `/games/${viewId.replace('view-game-', '')}` : `/${viewId.replace(/^view-/, '')}`);
    const selector = page.locator(`#${viewId}`);

    await page.goto(route, { waitUntil: 'commit' }).catch(() => { });
    await expect.poll(() => new URL(page.url()).pathname, { timeout }).toBe(route);
    await expect(selector).toBeVisible({ timeout });
};
