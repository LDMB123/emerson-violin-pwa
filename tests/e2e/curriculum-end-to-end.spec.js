import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { gotoAndExpectView } from './helpers/view-navigation.js';

test('curriculum mission progress is reflected in progress and analysis views', async ({ page }) => {
    await openHome(page);

    await gotoAndExpectView(page, '#view-progress');
    await page.evaluate(() => {
        const details = document.querySelector('details.progress-details');
        if (details) details.open = true;
    });
    await expect(page.locator('#view-progress [data-progress-curriculum-map]')).toBeAttached();
    await expect(page.locator('#view-progress [data-progress-next-actions] li').first()).toBeAttached();

    await gotoAndExpectView(page, '#view-analysis');
    await expect(page.locator('#view-analysis.is-active [data-analysis="mission-status"]')).toBeVisible();
    await expect(page.locator('#view-analysis.is-active [data-analysis="next-actions"] li').first()).toBeVisible();
});
