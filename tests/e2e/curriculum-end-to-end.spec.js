import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { gotoAndExpectView } from './helpers/view-navigation.js';

test('curriculum mission progress is reflected in progress and analysis views', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER] ${msg.text()}`));
    await openHome(page);

    await gotoAndExpectView(page, '/wins');
    await expect(page.locator('#view-wins.is-active .streak-number')).toBeVisible({ timeout: 15000 });

    await gotoAndExpectView(page, '/parent/review');
    await expect(page.locator('.curriculum-map-grid')).toBeVisible({ timeout: 15000 });
});
