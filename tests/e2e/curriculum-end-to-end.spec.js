import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

test('curriculum mission progress is reflected in progress and analysis views', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-progress');
    await page.evaluate(() => {
        const details = document.querySelector('details.progress-details');
        if (details) details.open = true;
    });
    await expect(page.locator('#view-progress [data-progress-curriculum-map]')).toBeAttached();
    await expect(page.locator('#view-progress [data-progress-next-actions] li').first()).toBeAttached();

    await page.goto('/#view-analysis');
    await expect(page.locator('#view-analysis.is-active [data-analysis="mission-status"]')).toBeVisible();
    await expect(page.locator('#view-analysis.is-active [data-analysis="next-actions"] li').first()).toBeVisible();
});
