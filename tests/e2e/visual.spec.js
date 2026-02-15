import { test, expect } from '@playwright/test';

const disableMotion = async (page) => {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
      }
    `,
  });
};

const setup = async (page) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // no-op
    }
  });
};

const navigateToSection = async (page, hash, selector) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-shell')).toBeVisible({ timeout: 15000 });
  await page.evaluate((value) => {
    window.location.hash = value;
  }, hash);
  await expect(page.locator(selector)).toBeVisible({ timeout: 15000 });
};

const visualOptions = (page) => ({
  animations: 'disabled',
  caret: 'hide',
  maxDiffPixelRatio: 0.04,
  mask: [
    page.locator('[aria-live]'),
    page.locator('[data-offline-indicator]'),
    page.locator('[data-device-status]'),
    page.locator('[data-install-status]'),
    page.locator('[data-storage-status]'),
    page.locator('[data-session-timer]'),
    page.locator('[data-session-status]'),
  ],
});

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Visual snapshots are pinned to chromium for deterministic CI baselines.');
  await setup(page);
});

test.describe('Visual regression - desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
  });

  test('overview section (desktop)', async ({ page }) => {
    await navigateToSection(page, '#overview', '#overview');
    await disableMotion(page);
    await expect(page.locator('#overview')).toBeVisible();
    await expect(page.locator('#overview')).toHaveScreenshot('overview-section-desktop.png', visualOptions(page));
  });

  test('studio section (desktop)', async ({ page }) => {
    await navigateToSection(page, '#studio', '#studio');
    await disableMotion(page);
    await expect(page.locator('#studio')).toBeVisible();
    await expect(page.locator('#studio')).toHaveScreenshot('studio-section-desktop.png', visualOptions(page));
  });

  test('controls section (desktop)', async ({ page }) => {
    await navigateToSection(page, '#controls', '#controls');
    await disableMotion(page);
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#controls')).toHaveScreenshot('controls-section-desktop.png', visualOptions(page));
  });
});

test.describe('Visual regression - mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('overview section (mobile)', async ({ page }) => {
    await navigateToSection(page, '#overview', '#overview');
    await disableMotion(page);
    await expect(page.locator('#overview')).toBeVisible();
    await expect(page.locator('#overview')).toHaveScreenshot('overview-section-mobile.png', visualOptions(page));
  });

  test('studio section (mobile)', async ({ page }) => {
    await navigateToSection(page, '#studio', '#studio');
    await disableMotion(page);
    await expect(page.locator('#studio')).toBeVisible();
    await expect(page.locator('#studio')).toHaveScreenshot('studio-section-mobile.png', visualOptions(page));
  });

  test('controls section (mobile)', async ({ page }) => {
    await navigateToSection(page, '#controls', '#controls');
    await disableMotion(page);
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#controls')).toHaveScreenshot('controls-section-mobile.png', visualOptions(page));
  });
});
