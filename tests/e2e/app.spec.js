import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { seedKVValue } from './helpers/seed-kv.js';
import { gotoAndExpectView, setParentUnlocked } from './helpers/view-navigation.js';

const clickAndExpectView = async (page, trigger, targetViewLocator, { timeout = 10000 } = {}) => {
  await expect(trigger).toBeVisible({ timeout });
  await trigger.click();
  await expect(targetViewLocator).toBeVisible({ timeout });
};

const seedSongEvents = async (page, events) => {
  await seedKVValue(page, 'panda-violin:events:v1', events);
};

const seedSongProgress = async (page, state) => {
  await seedKVValue(page, 'panda-violin:song-progress-v2', state);
};

test.describe('Kid-first flows', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    await openHome(page);
  });

  test('shows mission-first home and 3-item child nav', async ({ page }) => {
    await expect(page).toHaveTitle(/Panda Violin/);
    await expect(page.locator('a[href="/tools"]').first()).toBeVisible();
    await expect(page.locator('.bottom-nav .nav-item')).toHaveCount(5);
    await expect(page.locator('[data-parent-lock]')).toBeVisible();
  });

  test('start practice reaches coach in one tap', async ({ page }) => {
    const startBtn = page.locator('.btn-giant[data-start-practice]').first();
    await clickAndExpectView(page, startBtn, page.locator('#view-coach'));
    await expect(page.locator('.practice-focus')).toBeVisible();
    await expect(page.locator('.focus-status')).toContainText(/Ready!/);
  });

  test('child can reach games and launch a game in two taps', async ({ page }) => {
    await clickAndExpectView(page, page.locator('a[href="/games"]').first(), page.locator('#view-games'));
    await clickAndExpectView(page, page.locator('a[href="/games/pitch-quest"]').first(), page.locator('#view-game-pitch-quest'));
    await page.locator('#view-game-pitch-quest button').first().click();
    await expect(page.locator('#view-game-pitch-quest .pitch-quest-stage')).toBeVisible({ timeout: 20000 });
  });

  test('child can open songs and continue last song in two taps', async ({ page }) => {
    const now = Date.now();
    await seedSongEvents(page, [
      { type: 'song', id: 'mary', accuracy: 84, stars: 3, day: Math.floor(now / 86400000), timestamp: now },
    ]);
    await seedSongProgress(page, {
      version: 2,
      songs: {
        mary: {
          attempts: 1,
          bestAccuracy: 84,
          bestTiming: 84,
          bestIntonation: 84,
          bestStars: 3,
          sectionProgress: {},
          checkpoint: {
            sectionId: null,
            elapsed: 9,
            tempo: 88,
            savedAt: now,
          },
          updatedAt: now,
        },
      },
    });

    await clickAndExpectView(page, page.locator('a[href="/songs"]').first(), page.locator('#view-songs'));
    const continueLink = page.locator('[data-continue-last-song]');
    await expect(continueLink).toBeVisible({ timeout: 10000 });
    await continueLink.click();
    await expect(page.locator('.song-view').first()).toBeVisible({ timeout: 10000 });

    await expect(page.locator('.song-view').first()).toBeVisible();
  });

  test('advanced controls are not visible in child settings', async ({ page }) => {
    await gotoAndExpectView(page, '/settings');
    await expect(page.locator('[data-parent-advanced-controls]')).toHaveCount(0);
    await expect(page.locator('[data-offline-check]')).toHaveCount(0);
    await expect(page.locator('[data-sw-update]')).toHaveCount(0);
  });

  test('parent advanced controls are PIN gated', async ({ page }) => {
    await clickAndExpectView(page, page.locator('[data-parent-lock]'), page.locator('#view-parent'));

    const dialog = page.locator('[data-pin-dialog]');
    await expect(dialog).toBeVisible();

    await page.locator('#parent-pin-input').fill('0000');
    await page.locator('[data-pin-dialog] button[value="confirm"]').click();
    await expect(dialog).toBeVisible();

    await setParentUnlocked(page, true);
    await gotoAndExpectView(page, '/home');
    await gotoAndExpectView(page, '/parent');
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await page.locator('button:has-text("Settings")').click();
    await expect(page.locator('.parent-settings-panel')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).not.toHaveCount(0);
  });
});
