import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

test('coach mission flow updates timeline and home summary', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-coach');
    await expect(page.locator('#view-coach')).toBeVisible();
    await expect(page.locator('#view-coach.is-active [data-coach-mission-status]')).toBeVisible();
    await expect(page.locator('#view-coach.is-active [data-coach-mission-timeline] .mission-timeline-item').first()).toBeAttached();

    await page.goto('/#view-home');
    await expect(page.locator('#view-home.is-active [data-continue-practice]')).toBeVisible();
});
