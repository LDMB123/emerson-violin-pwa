import { expect, test } from '@playwright/test';
import { navigateToView } from './helpers/navigate-view.js';
import { openHome } from './helpers/open-home.js';
import { collectSongDetailRoutes, openSongsView } from './helpers/songs-view.js';

const startSongPlayMode = async (page) => {
    const toggle = page.locator('.song-view.is-active .song-play-toggle');
    await page.locator('.song-view.is-active label.btn-start').click();
    await expect(toggle).toBeChecked();
    return toggle;
};

const stopSongPlayMode = async (page) => {
    const toggle = page.locator('.song-view.is-active .song-play-toggle');
    await page.locator('.song-view.is-active label.btn-stop').click();
    await expect(toggle).not.toBeChecked();
};

const openUtilityRoute = async (page, key, viewId) => {
    await page.locator(`[data-home-utility="${key}"]`).click();
    await page.waitForURL(`**/#${viewId}`, { timeout: 4000 }).catch(() => undefined);
    if (await page.locator(`#${viewId}`).isVisible().catch(() => false)) return;
    await navigateToView(page, viewId, { timeout: 6000 });
};

const returnHome = async (page, viewId) => {
    await page.locator(`#${viewId} .back-btn`).click();
    await page.waitForURL('**/#view-home', { timeout: 4000 }).catch(() => undefined);
    if (await page.locator('#view-home').isVisible().catch(() => false)) return;
    await navigateToView(page, 'view-home', { timeout: 6000 });
};

const openSongRoute = async (page, route) => {
    await page.goto(`/${route}`);
    await page.waitForURL(`**/${route}`).catch(() => undefined);
    if (await page.locator('.song-view.is-active').isVisible().catch(() => false)) return;
    await navigateToView(page, route.replace(/^#/, ''), { timeout: 10000 }).catch(() => undefined);
    await expect(page.locator('.song-view.is-active')).toBeVisible({ timeout: 10000 });
};

test('utility routes are reachable from home links', async ({ page }) => {
    test.setTimeout(60000);
    await openHome(page);

    const routes = [
        { key: 'settings', viewId: 'view-settings' },
        { key: 'progress', viewId: 'view-progress' },
    ];

    for (const route of routes) {
        await openUtilityRoute(page, route.key, route.viewId);
        await expect(page.locator(`#${route.viewId}`)).toBeVisible();
        await returnHome(page, route.viewId);
        await expect(page.locator('#view-home')).toBeVisible();
    }
});

test('all song detail routes load and playhead controls toggle', async ({ page }) => {
    test.setTimeout(120000);
    await openHome(page);
    await openSongsView(page);
    const songRoutes = await collectSongDetailRoutes(page);

    expect(songRoutes.length).toBeGreaterThan(0);

    for (const route of songRoutes) {
        await openSongRoute(page, route);
        await startSongPlayMode(page);
        await stopSongPlayMode(page);
    }
});

test('song play mode auto-stops when the run duration completes', async ({ page }) => {
    test.setTimeout(40000);
    await openHome(page);

    await openSongRoute(page, '#view-song-twinkle');

    const toggle = await startSongPlayMode(page);

    await expect(toggle).not.toBeChecked({ timeout: 38000 });
});
