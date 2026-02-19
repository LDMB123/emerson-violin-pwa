import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

test('coach tools stay functional after leaving and returning to coach', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-coach');
    await expect(page.locator('#view-coach')).toBeVisible();

    await page.locator('[data-coach-action="next"]').click();
    await page.waitForTimeout(700);
    await expect(page.locator('.coach-bubble-text')).not.toHaveText('');

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-coach');
    await expect(page.locator('#view-coach')).toBeVisible();

    await page.locator('[data-coach-step-target="warmup"]').click();
    await page.locator('.practice-focus .btn-start').click();
    await expect(page.locator('.focus-status')).toContainText('Time left');
    await page.locator('.practice-focus .btn-stop').click();
    await expect(page.locator('.focus-status')).toContainText('Session paused');

    await page.locator('[data-coach-step-target="play"]').click();
    await page.locator('[data-lesson-runner-start]').click();
    await expect(page.locator('[data-lesson-runner-status]')).toContainText('Step in progress');
});

test('songs filtering and continue-last-song stay functional after navigation', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();

    await page.locator('label:has(input[name="song-filter"][value="challenge"]) .filter-chip').click();
    await expect(page.locator('.song-card:not(.is-hidden)')).toHaveCount(1);

    await page.locator('label:has(input[name="song-filter"][value="easy"]) .filter-chip').click();
    await expect(page.locator('.song-card:not(.is-hidden)')).toHaveCount(5);

    await page.locator('a[href="#view-song-mary"]').click();
    await page.waitForURL('**/#view-song-mary');
    await page.locator('.song-controls .btn-start').click();
    await page.waitForTimeout(250);
    await page.locator('.song-controls .btn-stop').click();
    await page.locator('.song-controls a[href="#view-songs"]').click();
    await page.waitForURL('**/#view-songs');

    await page.locator('label:has(input[name="song-filter"][value="easy"]) .filter-chip').click();
    await expect(page.locator('.song-card:not(.is-hidden)')).toHaveCount(5);

    await expect.poll(async () => {
        return page.locator('[data-continue-last-song]').getAttribute('href');
    }, { timeout: 10000 }).toContain('#view-song-mary');
});
