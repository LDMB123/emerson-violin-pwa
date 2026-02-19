import { expect, test } from '@playwright/test';

const openHome = async (page) => {
    await page.goto('/');
    await page.waitForSelector('#main-content .view', { timeout: 10000 });

    if (await page.locator('#view-onboarding').isVisible().catch(() => false)) {
        await page.locator('#onboarding-skip').click();
        await page.waitForURL('**/#view-home');
    }

    if (!page.url().includes('#view-home')) {
        await page.goto('/#view-home');
    }

    await expect(page.locator('#view-home')).toBeVisible();
};

test('utility routes are reachable from home links', async ({ page }) => {
    await openHome(page);

    const routes = [
        { key: 'settings', viewId: 'view-settings' },
        { key: 'help', viewId: 'view-help' },
        { key: 'about', viewId: 'view-about' },
    ];

    for (const route of routes) {
        await page.locator(`[data-home-utility="${route.key}"]`).click();
        await page.waitForURL(`**/#${route.viewId}`);
        await expect(page.locator(`#${route.viewId}`)).toBeVisible();
        await page.locator(`#${route.viewId} .back-btn`).click();
        await page.waitForURL('**/#view-home');
        await expect(page.locator('#view-home')).toBeVisible();
    }
});

test('all song detail routes load and playhead controls toggle', async ({ page }) => {
    test.setTimeout(120000);
    await openHome(page);

    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();

    const songRoutes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#view-songs .song-card'))
            .map((card) => card.getAttribute('href'))
            .filter((href) => typeof href === 'string' && href.startsWith('#view-song-'));
    });

    expect(songRoutes.length).toBeGreaterThan(0);

    for (const route of songRoutes) {
        const viewId = route.replace('#', '');
        await page.goto(`/${route}`);
        await expect(page.locator(`#${viewId}`)).toBeVisible();

        const toggle = page.locator(`#${viewId} .song-play-toggle`);
        await page.locator(`#${viewId} label.btn-start`).click();
        await expect(toggle).toBeChecked();

        await page.locator(`#${viewId} label.btn-stop`).click();
        await expect(toggle).not.toBeChecked();
    }
});
