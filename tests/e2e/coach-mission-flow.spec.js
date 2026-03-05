import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { gotoAndExpectView } from './helpers/view-navigation.js';

test('coach mission flow updates timeline and home summary', async ({ page }) => {
    await openHome(page);

    await gotoAndExpectView(page, '#view-coach');
    await expect(page.locator('#view-coach.is-active .focus-status')).toBeVisible();
    await expect(page.locator('#view-coach.is-active .focus-ring')).toBeAttached();

    await gotoAndExpectView(page, '#view-home');
    await expect(page.locator('#view-home.is-active a.btn-giant[href="#view-coach"]').first()).toBeVisible();
});
