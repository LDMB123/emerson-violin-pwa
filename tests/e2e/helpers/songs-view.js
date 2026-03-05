import { expect } from '@playwright/test';
import { navigateToView } from './navigate-view.js';

export const openSongsView = async (page) => {
    await navigateToView(page, 'view-songs', { timeout: 10000 });
    await expect(page.locator('#view-songs')).toBeVisible();
};

export const collectSongDetailRoutes = async (page) => page.evaluate(() => (
    Array.from(document.querySelectorAll('#view-songs .song-card'))
        .map((card) => card.getAttribute('href'))
        .filter((href) => typeof href === 'string' && href.startsWith('#view-song-'))
));
