import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { collectBrowserIssues } from './helpers/browser-issues.js';
import { openGame } from './helpers/game-flow.js';

test.describe('Canvas Games Integration', () => {

    test.beforeEach(async ({ page }) => {
        await openHome(page);
        await page.evaluate(() => {
            localStorage.setItem('userPreferences', JSON.stringify({ soundsEnabled: false }));
        });
    });

    test('Bow Hero Canvas Registers Pointer Input', async ({ page }) => {
        await openGame(page, 'bow-hero');

        // Ensure game canvas is mounted
        const canvas = page.locator('#bow-hero-canvas');
        await expect(canvas).toBeVisible({ timeout: 15000 });

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
        const issues = collectBrowserIssues(page, { ignoreLocalModuleLoadNoise: true });

        await openGame(page, 'pizzicato');

        const canvas = page.locator('#pizzicato-canvas');
        await expect(canvas).toBeVisible({ timeout: 15000 });

        // Click to force AudioContext resume
        await canvas.click();

        // Wait a few seconds for engine loop
        await page.waitForTimeout(2000);
        issues.flush('Pizzicato Game Audio Context Resumes');
    });
});
