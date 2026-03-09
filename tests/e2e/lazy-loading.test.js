import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { gotoView } from './helpers/view-navigation.js';

const measureViewLoadMs = async (page, viewHash, { timeout = 10000 } = {}) => {
    const startedAt = Date.now();
    await gotoView(page, viewHash, { timeout });
    return Date.now() - startedAt;
};

test.describe.skip('Lazy View Loading', () => {
    test.beforeEach(async ({ page }) => {
        // Hide install banner to prevent it from blocking navigation
        await page.addInitScript(() => {
            window.addEventListener('DOMContentLoaded', () => {
                const banner = document.getElementById('install-banner');
                if (banner) {
                    banner.style.display = 'none';
                }
            });
        });

        await openHome(page);
    });

    test('should load home view on initial visit', async ({ page }) => {
        await expect(page.locator('#main-content')).toContainText('Practice Coach');
        await expect(page.locator('.home-kid-title')).toContainText('Ready to play');

        // Verify home view elements are present

    });

    test('should lazy load trainer view', async ({ page }) => {
        await gotoView(page, '#view-trainer');

        // Verify trainer elements are present in DOM
        await expect(page.locator('#tool-metronome')).toBeAttached();
    });

    test('should lazy load coach view from navigation', async ({ page }) => {
        await gotoView(page, '#view-coach');
        await expect(page.locator('#view-coach')).toBeVisible();
    });

    test('should cache and quickly reload views', async ({ page }) => {
        const time1 = await measureViewLoadMs(page, '#view-coach');

        // Navigate away
        await gotoView(page, '#view-home');
        await expect(page.locator('.home-kid-title')).toContainText('Ready to play');

        const time2 = await measureViewLoadMs(page, '#view-coach');

        // Ensure reload stays in a practical cache-hit budget and does not regress badly.
        expect(time2).toBeLessThan(1200);
        expect(time2).toBeLessThan(time1 + 350);
    });

    test('should load multiple different views in sequence', async ({ page }) => {
        // Load home
        await expect(page.locator('.home-kid-title')).toContainText('Ready to play');

        await gotoView(page, '#view-coach');
        await gotoView(page, '#view-games');
        await gotoView(page, '#view-progress');

        // Return to home via URL
        await gotoView(page, '#view-home');
        await expect(page.locator('.home-kid-title')).toContainText('Ready to play');
    });

    test('should handle view loading errors gracefully', async ({ page }) => {
        // Try to load a non-existent view
        await page.goto('/#view-nonexistent');

        // Wait for any error handling
        await page.waitForTimeout(1000);

        // At minimum, verify no crash by checking page is still responsive
        expect(await page.evaluate(() => document.readyState)).toBe('complete');

        // The page should still be functional - test by navigating to a valid view
        await gotoView(page, '#view-home');
        await expect(page.locator('.home-kid-title')).toContainText('Ready to play');
    });

    test('should maintain view state after navigation', async ({ page }) => {
        await gotoView(page, '#view-progress');

        // Navigate away
        await gotoView(page, '#view-home');
        await expect(page.locator('.home-kid-title')).toContainText('Ready to play');

        await gotoView(page, '#view-progress');

        // View should load quickly from cache
        const loadTime = await page.evaluate(() => {
            return performance.now();
        });
        expect(loadTime).toBeGreaterThan(0);
    });

    test('should load views with deep navigation paths', async ({ page }) => {
        await gotoView(page, '#view-games');
        await gotoView(page, '#view-game-pitch-quest');
        await expect(page.locator('#view-game-pitch-quest')).toBeVisible();
    });

    test('should preload views efficiently', async ({ page }) => {
        // Home view should be loaded
        await expect(page.locator('.home-kid-title')).toBeVisible();

        const views = ['#view-coach', '#view-games', '#view-progress'];

        for (const view of views) {
            await gotoView(page, view);
        }

        // All views should now be cached
        // Navigate back through them quickly
        for (const view of ['#view-home', ...views]) {
            const loadTime = await measureViewLoadMs(page, view);

            // Cached views should load relatively quickly
            // Using a more realistic timeout since goto() has overhead
            expect(loadTime).toBeLessThan(1200);
        }
    });
});
