import { expect, test } from '@playwright/test';

const openHome = async (page) => {
    await page.goto('/');
    await page.waitForSelector('#main-content .view', { timeout: 10000 });

    if (await page.locator('#view-onboarding').isVisible().catch(() => false)) {
        await page.locator('#onboarding-skip').click();
        await page.waitForURL('**/#view-home');
    }
};

test('games remain interactive after leaving and re-entering the same game', async ({ page }) => {
    await openHome(page);

    await page.locator('.bottom-nav a[href="#view-games"]').click();
    await page.waitForURL('**/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.locator('a[href="#view-game-pitch-quest"]').click();
    await page.waitForURL('**/#view-game-pitch-quest');
    await expect(page.locator('#view-game-pitch-quest')).toBeVisible();

    const firstScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    await expect(firstScore).toHaveText('0');
    await page.locator('#view-game-pitch-quest [data-pitch="check"]').click();
    await expect(firstScore).not.toHaveText('0');

    await page.locator('#view-game-pitch-quest .back-btn').click();
    await page.waitForURL('**/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await expect(page.locator('#game-complete-modal')).not.toBeVisible();

    await page.locator('a[href="#view-game-pitch-quest"]').click();
    await page.waitForURL('**/#view-game-pitch-quest');
    await expect(page.locator('#view-game-pitch-quest')).toBeVisible();

    const secondScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    await expect(secondScore).toHaveText('0');
    await page.locator('#view-game-pitch-quest [data-pitch="check"]').click();
    await expect(secondScore).not.toHaveText('0');
});
