import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { gotoAndExpectView } from './helpers/view-navigation.js';

test('coach mission flow updates timeline and home summary', async ({ page }) => {
    await openHome(page);

    await gotoAndExpectView(page, '/coach');
    await expect(page.locator('#view-coach.is-active .focus-status')).toBeVisible();
    await expect(page.locator('#view-coach.is-active .focus-ring')).toBeAttached();

    await gotoAndExpectView(page, '/home');
    await expect(page.locator('#view-home.is-active .btn-giant[data-start-practice]').first()).toBeVisible();
});
