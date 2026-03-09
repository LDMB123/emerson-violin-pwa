import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToPath } from './helpers/navigate-view.js';

test('song detail supports detail, play, record, and checkpoint persistence', async ({ page }) => {
    await openHome(page);

    await navigateToPath(page, '/songs/mary');
    await expect(page.locator('#view-song-mary')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[href="/songs/mary/play"]')).toBeVisible();
    await expect(page.locator('a[href="/songs/mary/play?record=1"]')).toBeVisible();

    await navigateToPath(page, '/songs/mary/play');
    await expect(page.locator('#view-song-mary [data-song-advanced-controls]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#view-song-mary .song-sheet')).toBeVisible();

    const sectionSelect = page.locator('#view-song-mary [data-song-section]');
    if (await sectionSelect.count()) {
        await sectionSelect.selectOption({ index: 1 });
    }

    await page.locator('#view-song-mary [data-song-tempo-scale]').evaluate((slider) => {
        if (!(slider instanceof HTMLInputElement)) return;
        slider.value = '110';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#view-song-mary [data-song-save-checkpoint]').click();
    await expect(page.locator('#view-song-mary [data-song-advanced-status]')).toContainText(/checkpoint saved/i);

    await navigateToPath(page, '/songs');
    await expect(page.locator('#view-songs [data-song="mary"]')).toContainText('Resume', { timeout: 10000 });

    await navigateToPath(page, '/songs/mary/play?record=1');
    await expect(page.locator('#view-song-mary [data-song-advanced-controls]')).toBeVisible({ timeout: 10000 });
});
