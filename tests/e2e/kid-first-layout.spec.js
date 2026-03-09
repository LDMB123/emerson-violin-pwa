import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToPath } from './helpers/navigate-view.js';

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 834, height: 1194 };

const assertNoHorizontalOverflow = async (page) => {
    await expect.poll(async () => page.evaluate(() => {
        const htmlOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
        const bodyOverflow = Math.max(0, document.body.scrollWidth - document.body.clientWidth);
        return Math.max(htmlOverflow, bodyOverflow);
    }), { timeout: 10000 }).toBeLessThanOrEqual(1);
};

const assertBottomNavClearance = async (page, selector) => {
    const target = page.locator(selector).last();
    const nav = page.locator('.bottom-nav');

    await target.scrollIntoViewIfNeeded();
    const [targetBox, navBox] = await Promise.all([target.boundingBox(), nav.boundingBox()]);
    expect(targetBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(targetBox.y + targetBox.height).toBeLessThanOrEqual(navBox.y - 4);
};

const SURFACES = [
    { path: '/home', view: '#view-home', selector: '[data-start-practice]' },
    { path: '/games', view: '#view-games', selector: '#view-games [data-game-id]' },
    { path: '/songs', view: '#view-songs', selector: '#view-songs [data-song]' },
    { path: '/tools', view: '#view-trainer', selector: '#tool-posture' },
    { path: '/wins', view: '#view-progress', selector: '#view-progress .skill-meter' },
];

test('captures iPad and phone layouts for core child views', async ({ page }, testInfo) => {
    await openHome(page);

    for (const viewport of [TABLET, PHONE]) {
        await page.setViewportSize(viewport);

        for (const surface of SURFACES) {
            await navigateToPath(page, surface.path);
            await expect(page.locator(surface.view)).toBeVisible({ timeout: 10000 });
            await assertNoHorizontalOverflow(page);
            await assertBottomNavClearance(page, surface.selector);

            await page.screenshot({
                path: testInfo.outputPath(`${viewport.width}x${viewport.height}-${surface.path.replace(/\W+/g, '_')}.png`),
                fullPage: true,
            });
        }
    }
});
