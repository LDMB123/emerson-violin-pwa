import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

const goToView = async (page, viewId) => {
    await page.evaluate((targetViewId) => {
        window.location.hash = `#${targetViewId}`;
    }, viewId);
    await expect(page.locator(`#${viewId}`)).toBeVisible({ timeout: 10000 });
};

test('critical views should not emit runtime page/console errors', async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (error) => {
        pageErrors.push(error.message || String(error));
    });

    page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (text.includes('favicon.ico')) return;
        if (text.includes('Did not parse stylesheet')) return;
        consoleErrors.push(text);
    });

    await openHome(page);

    const criticalViews = [
        'view-home',
        'view-coach',
        'view-games',
        'view-tuner',
        'view-trainer',
        'view-songs',
        'view-progress',
        'view-settings',
        'view-parent',
    ];

    for (const viewId of criticalViews) {
        await goToView(page, viewId);
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
});
