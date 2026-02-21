import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

test.describe('Kid-first flows', () => {
  test.beforeEach(async ({ page }) => {
    await openHome(page);
  });

  test('shows mission-first home and 3-item child nav', async ({ page }) => {
    await expect(page).toHaveTitle(/Panda Violin/);
    await expect(page.locator('a[href="#view-coach"]').first()).toBeVisible();
    await expect(page.locator('.bottom-nav .nav-item')).toHaveCount(3);
    await expect(page.locator('[data-parent-lock]')).toBeVisible();
  });

  test('start practice reaches coach in one tap', async ({ page }) => {
    // Navigate via the giant home button instead of the old data attribute
    await page.locator('.home-giant-actions a[href="#view-coach"]').click();
    await page.waitForURL('**/#view-coach');

    await expect(page.locator('#view-coach')).toBeVisible();
    await expect(page.locator('.practice-focus')).toBeVisible();
    await expect(page.locator('.focus-status')).toContainText('Ready!');
  });

  test('child can reach games and launch a game in two taps', async ({ page }) => {
    await page.locator('.bottom-nav a[href="#view-games"]').click();
    await page.waitForURL('**/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.locator('a[href="#view-game-pitch-quest"]').click();
    await page.waitForURL('**/#view-game-pitch-quest');
    await expect(page.locator('#view-game-pitch-quest .game-drill')).toBeVisible();
  });

  test('child can open songs and continue last song in two taps', async ({ page }) => {
    await page.locator('.bottom-nav a[href="#view-songs"]').click();
    await page.waitForURL('**/#view-songs');

    await page.locator('[data-continue-last-song]').click();
    await page.waitForURL(/#view-song-/);

    await expect(page.locator('.song-view')).toBeVisible();
  });

  test('advanced controls are not visible in child settings', async ({ page }) => {
    await page.goto('/#view-settings');
    await expect(page.locator('#view-settings')).toBeVisible();
    await expect(page.locator('[data-parent-advanced-controls]')).toHaveCount(0);
    await expect(page.locator('[data-offline-check]')).toHaveCount(0);
    await expect(page.locator('[data-sw-update]')).toHaveCount(0);
  });

  test('parent advanced controls are PIN gated', async ({ page }) => {
    await page.locator('[data-parent-lock]').click();
    await page.waitForURL('**/#view-parent');

    const dialog = page.locator('[data-pin-dialog]');
    await expect(dialog).toBeVisible();

    await page.locator('#parent-pin-input').fill('0000');
    await page.locator('[data-pin-dialog] button[value="confirm"]').click();
    await expect(dialog).toBeVisible();

    await page.evaluate(() => {
      sessionStorage.setItem('panda-violin:parent-unlocked', 'true');
    });
    await page.goto('/#view-parent');
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator('[data-parent-advanced-controls]')).toBeVisible();
    await expect(page.locator('[data-offline-check]')).toBeVisible();
    await expect(page.locator('[data-sw-update]')).toBeVisible();
  });
});
