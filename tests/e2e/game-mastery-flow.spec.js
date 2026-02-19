import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

test('games view shows mastery metadata after gameplay event', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-games');
    await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('panda:game-mastery-updated', {
            detail: {
                id: 'rhythm-dash',
                mastery: {
                    id: 'rhythm-dash',
                    attempts: 1,
                    best: 82,
                    bronzeDays: 1,
                    silverDays: 0,
                    goldDays: 0,
                    tier: 'bronze',
                },
            },
        }));
    });

    const masteryMeta = page.locator('.game-card[data-game-id="rhythm-dash"] [data-game-mastery-meta]');
    await expect(masteryMeta).toBeVisible();
    await expect(masteryMeta).toContainText(/bronze/i);
});
