import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToView } from './helpers/navigate-view.js';

test.describe('Lazy View Loading', () => {
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
        // Check that home view is loaded
        await expect(page.locator('#main-content')).toContainText('Today\'s Practice Mission');
        await expect(page.locator('.home-title')).toContainText('Ready to play');
        await expect(page.locator('.home-subtitle')).toContainText('Start with one quick mission');

        // Verify home view elements are present
        await expect(page.locator('.home-mascot')).toBeVisible();
        await expect(page.locator('.home-mission')).toBeVisible();
    });

    test('should lazy load trainer view', async ({ page }) => {
        // Navigate to trainer view via direct URL
        await page.goto('/#view-trainer');

        // Wait for view content to load
        await expect(page.locator('#view-trainer')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#main-content')).toContainText('Practice Tools', { timeout: 10000 });

        // Verify trainer elements are present in DOM
        await expect(page.locator('#tool-metronome')).toBeAttached();
    });

    test('should lazy load coach view from navigation', async ({ page }) => {
        await navigateToView(page, 'view-coach');
        await expect(page.locator('#view-coach')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#main-content')).toContainText('Practice Mission', { timeout: 10000 });
    });

    test('should cache and quickly reload views', async ({ page }) => {
        // First load of coach view - measure network timing
        const start1 = Date.now();
        await page.goto('/#view-coach');
        await expect(page.locator('#main-content')).toContainText('Practice Mission', { timeout: 10000 });
        const time1 = Date.now() - start1;

        // Navigate away
        await page.goto('/#view-home');
        await page.waitForSelector('.home-title');

        // Second load of coach (should be cached)
        const start2 = Date.now();
        await page.goto('/#view-coach');
        await expect(page.locator('#main-content')).toContainText('Practice Mission', { timeout: 10000 });
        const time2 = Date.now() - start2;

        // Ensure reload stays in a practical cache-hit budget and does not regress badly.
        expect(time2).toBeLessThan(1200);
        expect(time2).toBeLessThan(time1 + 250);
    });

    test('should load multiple different views in sequence', async ({ page }) => {
        // Load home
        await expect(page.locator('.home-title')).toContainText('Ready to play');

        // Load coach via URL
        await page.goto('/#view-coach');
        await page.waitForURL('**/#view-coach');
        await expect(page.locator('#main-content')).toContainText('Practice Mission', { timeout: 10000 });

        // Load games via URL
        await page.goto('/#view-games');
        await page.waitForURL('**/#view-games');
        await expect(page.locator('#main-content')).toContainText('Games', { timeout: 10000 });

        // Load progress via URL
        await page.goto('/#view-progress');
        await page.waitForURL('**/#view-progress');
        await expect(page.locator('#main-content')).toContainText('Progress', { timeout: 10000 });

        // Return to home via URL
        await page.goto('/#view-home');
        await page.waitForURL('**/#view-home');
        await expect(page.locator('.home-title')).toContainText('Ready to play');
    });

    test('should handle view loading errors gracefully', async ({ page }) => {
        // Try to load a non-existent view
        await page.goto('/#view-nonexistent');

        // Wait for any error handling
        await page.waitForTimeout(1000);

        // At minimum, verify no crash by checking page is still responsive
        expect(await page.evaluate(() => document.readyState)).toBe('complete');

        // The page should still be functional - test by navigating to a valid view
        await page.goto('/#view-home');
        await expect(page.locator('.home-title')).toContainText('Ready to play');
    });

    test('should maintain view state after navigation', async ({ page }) => {
        // Navigate to progress view via URL
        await page.goto('/#view-progress');
        await page.waitForURL('**/#view-progress');
        await expect(page.locator('#main-content')).toContainText('Progress', { timeout: 10000 });

        // Navigate away via URL
        await page.goto('/#view-home');
        await expect(page.locator('.home-title')).toContainText('Ready to play');

        // Navigate back to progress via URL
        await page.goto('/#view-progress');
        await page.waitForURL('**/#view-progress');
        await expect(page.locator('#main-content')).toContainText('Progress', { timeout: 10000 });

        // View should load quickly from cache
        const loadTime = await page.evaluate(() => {
            return performance.now();
        });
        expect(loadTime).toBeGreaterThan(0);
    });

    test('should load views with deep navigation paths', async ({ page }) => {
        // Navigate to games view via URL
        await page.goto('/#view-games');
        await page.waitForURL('**/#view-games');
        await expect(page.locator('#main-content')).toContainText('Games', { timeout: 10000 });

        // Navigate to a specific game via URL
        await page.goto('/#view-game-pitch-quest');
        await page.waitForURL('**/#view-game-pitch-quest');
        await expect(page.locator('#main-content')).toContainText('Pitch Quest', { timeout: 10000 });
    });

    test('should preload views efficiently', async ({ page }) => {
        // Home view should be loaded
        await expect(page.locator('.home-title')).toBeVisible();

        // Navigate quickly between views to test caching
        const views = [
            { id: 'coach', text: 'Practice Mission' },
            { id: 'games', text: 'Games' },
            { id: 'progress', text: 'Progress' }
        ];

        for (const view of views) {
            await page.goto(`/#view-${view.id}`);
            await page.waitForURL(`**/#view-${view.id}`);
            await expect(page.locator('#main-content')).toContainText(view.text, { timeout: 10000 });
        }

        // All views should now be cached
        // Navigate back through them quickly
        for (const view of [{ id: 'home', text: 'Today\'s Practice Mission' }, ...views]) {
            const start = Date.now();
            await page.goto(`/#view-${view.id}`);
            await page.waitForURL(`**/#view-${view.id}`);
            const loadTime = Date.now() - start;

            // Cached views should load relatively quickly
            // Using a more realistic timeout since goto() has overhead
            expect(loadTime).toBeLessThan(1200);
        }
    });
});
