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

    // Use native Playwright goto with commit synchronization to wait for React's event loop
    await page.goto(route, { waitUntil: 'commit' }).catch(() => { });
    await page.waitForURL(`**${route}`, { timeout });
};

export const navigateToView = async (page, view, { timeout = 10000 } = {}) => {
    const viewId = normalizeViewId(view);
    const routeName = viewId.replace(/^view-/, '');
    const route = `/${routeName}`;
    const selector = page.locator(`#${viewId}`);

    await page.goto(route, { waitUntil: 'commit' }).catch(() => { });
    await page.waitForURL(`**${route}`, { timeout });
    await expect(selector).toBeVisible({ timeout });
};
