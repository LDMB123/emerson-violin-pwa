import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

test('song detail supports section controls and checkpoint persistence', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();

    const firstSong = page.locator('.song-card[data-song]').first();
    await firstSong.click();

    await expect(page.locator('.song-view.is-active .song-advanced-controls')).toBeVisible();

    const sectionSelect = page.locator('.song-view.is-active [data-song-section]');
    await sectionSelect.selectOption({ index: 0 });

    await page.evaluate(() => {
        const slider = document.querySelector('.song-view.is-active [data-song-tempo-scale]');
        if (!(slider instanceof HTMLInputElement)) return;
        slider.value = '110';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await page.locator('.song-view.is-active [data-song-save-checkpoint]').click();
    await expect(page.locator('.song-view.is-active [data-song-advanced-status]')).toContainText(/checkpoint saved/i);

    await page.goto('/#view-songs');
    await expect(page.locator('.song-card.has-checkpoint').first()).toBeVisible();
});
