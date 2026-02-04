import { test, expect } from '@playwright/test';

test.describe('Emerson Violin Studio (Rust-first shell)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads the overview section', async ({ page }) => {
    await expect(page).toHaveTitle(/Emerson Violin Studio/i);
    await expect(page.locator('#overview')).toBeVisible();
    await expect(page.locator('[data-session-start]')).toBeVisible();
  });

  test('navigates to the studio section', async ({ page }) => {
    await page.click('a[href="#studio"]');
    await page.waitForURL('**/#studio');
    await expect(page.locator('#studio')).toBeVisible();
  });

  test('navigates to the controls section', async ({ page }) => {
    await page.click('a[href="#controls"]');
    await page.waitForURL('**/#controls');
    await expect(page.locator('#controls')).toBeVisible();
  });

  test('starts a session timer', async ({ page }) => {
    const status = page.locator('[data-session-status]');
    await expect(status).toContainText(/Ready/i);
    await page.click('[data-session-start]');
    await expect(status).toContainText(/running/i);
  });
});
