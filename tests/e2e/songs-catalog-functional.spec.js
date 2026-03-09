import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { collectBrowserIssues } from './helpers/browser-issues.js';
import { openHome } from './helpers/open-home.js';
import { navigateToPath } from './helpers/navigate-view.js';

const catalog = JSON.parse(
    readFileSync(new URL('../../public/content/songs/catalog.v2.json', import.meta.url), 'utf8'),
);

const songs = catalog.songs || [];
const tierLabel = {
    beginner: 'Easy',
    intermediate: 'Practice',
    challenge: 'Challenge',
};

const chunkSongs = (items, size) => {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
};

const applyTierFilter = async (page, tier) => {
    const chip = page.locator(`.filter-chips button:has-text("${tierLabel[tier]}")`);
    await chip.scrollIntoViewIfNeeded().catch(() => undefined);
    await expect(chip).toBeVisible({ timeout: 10000 });
    await chip.click({ force: true });
};

const assertSongSurface = async (page, song) => {
    await navigateToPath(page, '/songs');
    await expect(page.locator('#view-songs')).toBeVisible({ timeout: 10000 });
    await applyTierFilter(page, song.tier);
    const card = page.locator(`#view-songs [data-song="${song.id}"]`);
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card).toHaveAttribute('data-tier', song.tier);

    await navigateToPath(page, `/songs/${song.id}`);
    await expect(page.locator(`#view-song-${song.id}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`a[href="/songs/${song.id}/play"]`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`a[href="/songs/${song.id}/play?record=1"]`)).toBeVisible({ timeout: 10000 });

    await navigateToPath(page, `/songs/${song.id}/play`);
    await expect(page.locator(`#view-song-${song.id} .song-sheet`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`#view-song-${song.id} .song-note`).first()).toBeVisible();

    await navigateToPath(page, `/songs/${song.id}/play?record=1`);
    await expect(page.locator(`#view-song-${song.id} [data-song-advanced-controls]`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`#view-song-${song.id} .song-sheet`)).toBeVisible();
};

chunkSongs(songs, 4).forEach((songGroup, groupIndex) => {
    test(`song catalog matrix group ${groupIndex + 1}`, async ({ page }) => {
        test.setTimeout(120000);
        const issues = collectBrowserIssues(page, { ignoreLocalModuleLoadNoise: true });
        await openHome(page);
        issues.flush(`songs bootstrap group ${groupIndex + 1}`);

        for (const song of songGroup) {
            await assertSongSurface(page, song);
            issues.flush(`song ${song.id}`);
        }
    });
});
