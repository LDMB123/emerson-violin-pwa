import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { seedKVValue } from './helpers/seed-kv.js';
import { gotoAndExpectView, setParentUnlocked } from './helpers/view-navigation.js';

const clickAndExpectView = async (page, trigger, targetViewLocator, { timeout = 10000 } = {}) => {
  await expect.poll(async () => {
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click({ force: true }).catch(() => {});
    }
    return targetViewLocator.isVisible().catch(() => false);
  }, { timeout }).toBe(true);
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
    await openHome(page);
  });

  test('shows mission-first home and 3-item child nav', async ({ page }) => {
    await expect(page).toHaveTitle(/Panda Violin/);
    await expect(page.locator('a[href="#view-coach"]').first()).toBeVisible();
    await expect(page.locator('.bottom-nav .nav-item')).toHaveCount(3);
    await expect(page.locator('[data-parent-lock]')).toBeVisible();
  });

  test('start practice reaches coach in one tap', async ({ page }) => {
    await clickAndExpectView(page, page.locator('a[href="#view-coach"]').first(), page.locator('#view-coach'));
    await expect(page.locator('.practice-focus')).toBeVisible();
    await expect(page.locator('.focus-status')).toContainText(/Ready!/);
  });

  test('child can reach games and launch a game in two taps', async ({ page }) => {
    await clickAndExpectView(page, page.locator('a[href="#view-games"]').first(), page.locator('#view-games'));
    await clickAndExpectView(page, page.locator('a[href="#view-game-pitch-quest"]').first(), page.locator('#view-game-pitch-quest'));
    await expect(page.locator('#view-game-pitch-quest .pitch-quest-stage')).toBeVisible();
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

    await clickAndExpectView(page, page.locator('a[href="#view-songs"]').first(), page.locator('#view-songs'));
    await expect.poll(async () => {
      const continueLink = page.locator('[data-continue-last-song]');
      if (await continueLink.isVisible().catch(() => false)) {
        await continueLink.click({ force: true }).catch(() => {});
      }
      return page.locator('.song-view').isVisible().catch(() => false);
    }, { timeout: 10000 }).toBe(true);

    await expect(page.locator('.song-view')).toBeVisible();
  });

  test('advanced controls are not visible in child settings', async ({ page }) => {
    await gotoAndExpectView(page, '#view-settings');
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
    await gotoAndExpectView(page, '#view-parent');
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await expect(page.locator('[data-parent-advanced-controls]')).toBeVisible();
    await expect(page.locator('[data-offline-check]')).toBeVisible();
    await expect(page.locator('[data-sw-update]')).toBeVisible();
  });
});
