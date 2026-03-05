import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { gotoAndExpectView } from './helpers/view-navigation.js';

test('games view shows mastery metadata after gameplay event', async ({ page }) => {
    await openHome(page);

    await gotoAndExpectView(page, '#view-games');
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
    await expect.poll(async () => masteryMeta.isVisible().catch(() => false), { timeout: 10000 }).toBe(true);
    await expect(masteryMeta).toContainText(/bronze/i);
});
