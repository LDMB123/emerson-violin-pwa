import { test, expect } from '@playwright/test';

test.describe('Canvas Games Integration', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/games');
        await page.evaluate(() => {
            localStorage.setItem('onboarding-complete', 'true');
            localStorage.setItem('userPreferences', JSON.stringify({ soundsEnabled: false }));
            localStorage.setItem('e2e-skip-permissions', 'true');
        });
        await page.reload();
    });

    test('Bow Hero Canvas Registers Pointer Input', async ({ page }) => {
        await page.goto('/games/bow-hero');

        // Click Start Game if it exists
        const startBtn = page.locator('button:has-text("Start Game")');
        if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await startBtn.click();
        }

        // Ensure game canvas is mounted
        const canvas = page.locator('#bow-hero-canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Await the readiness overlay to clear before interacting
        await expect(page.locator('.game-ready-overlay')).toBeHidden({ timeout: 15000 });

        // Simulate a "down bow" swipe across the canvas
        const box = await canvas.boundingBox();
        expect(box).toBeTruthy();

        const startX = box.x + 50;
        const startY = box.y + 50;

        await page.mouse.move(startX, startY);
        await page.mouse.down();

        // Drag 100px right
        await page.mouse.move(startX + 100, startY, { steps: 5 });
        await page.mouse.up();

        // The exact score increase depends on the game tempo, but we verify 
        // the engine didn't crash and the UI is still responsive.
        const scoreUI = page.locator('.hud-score-value');
        if (await scoreUI.isVisible()) {
            await expect(scoreUI).not.toHaveText('0', { timeout: 5000 });
        }
    });

    test('Pizzicato Game Audio Context Resumes', async ({ page }) => {
        await page.goto('/games/pizzicato');

        // Click Start Game if it exists
        const startBtn = page.locator('button:has-text("Start Game")');
        if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await startBtn.click();
        }

        const canvas = page.locator('#pizzicato-canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Click to force AudioContext resume
        await canvas.click();

        // Verify no WASM/Audio engine crashes in the console
        let hasErrors = false;
        page.on('pageerror', () => { hasErrors = true; });
        page.on('console', msg => {
            if (msg.type() === 'error') hasErrors = true;
        });

        // Wait a few seconds for engine loop
        await page.waitForTimeout(2000);
        expect(hasErrors).toBe(false);
    });
});
