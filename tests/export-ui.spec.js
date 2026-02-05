import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('export and import controls are present', async ({ page }) => {
  const fileUrl = pathToFileURL(path.join(process.cwd(), 'index.html')).toString();
  await page.goto(fileUrl);
  await expect(page.locator('[data-export-summary-files]')).toBeVisible();
  await expect(page.locator('[data-score-open-files]')).toBeVisible();
  await expect(page.locator('[data-restore-open-files]')).toBeVisible();
  await expect(page.locator('[data-import-files]')).toBeVisible();
  await expect(page.locator('[data-ml-trace-filter-start]')).toBeVisible();
  await expect(page.locator('[data-game-score-filter-start]')).toBeVisible();
  await expect(page.locator('[data-game-score-profile-only]')).toBeVisible();
  await expect(page.locator('[data-game-score-filter-badge]')).toBeVisible();
  await expect(page.locator('[data-ml-trace-filter-badge]')).toBeVisible();
  await expect(page.locator('[data-recorder-filter-badge]')).toBeVisible();
  await page.evaluate(() => {
    const el = document.querySelector('[data-export-status]');
    if (el) el.textContent = 'Exported';
  });
  await expect(page.locator('[data-export-status]')).toHaveText('Exported');
});
