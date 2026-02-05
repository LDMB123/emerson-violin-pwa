import { test, expect } from '@playwright/test';

test.describe('PWA validation', () => {
  test('page loads and has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Emerson Violin Studio');
  });

  test('service worker registers successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker registration
    const swReady = await page.evaluate(async () => {
      if (!navigator.serviceWorker) return false;
      try {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      } catch (err) {
        return false;
      }
    }, { timeout: 10000 });
    
    expect(swReady).toBe(true);
  });

  test('cache storage has entries', async ({ page }) => {
    await page.goto('/');
    
    // Wait a bit for SW to populate caches
    await page.waitForTimeout(2000);
    
    const cacheKeys = await page.evaluate(async () => {
      if (!caches) return [];
      return await caches.keys();
    });
    
    expect(cacheKeys.length).toBeGreaterThan(0);
  });

  test('DB worker status element exists and is visible', async ({ page }) => {
    await page.goto('/');
    const dbWorkerStatus = page.locator('[data-db-worker-status]');
    await expect(dbWorkerStatus).toBeVisible();
  });

  test('migration UI elements exist', async ({ page }) => {
    await page.goto('/');
    
    // Migration banner (may be hidden initially)
    const migrateBanner = page.locator('[data-migrate-banner]');
    await expect(migrateBanner).toBeAttached();
    
    // Migration controls in diagnostics
    const dbMigrate = page.locator('[data-db-migrate]');
    await expect(dbMigrate).toBeVisible();
    
    const dbMigrateStatus = page.locator('[data-db-migrate-status]');
    await expect(dbMigrateStatus).toBeVisible();
  });

  test('storage status elements exist', async ({ page }) => {
    await page.goto('/');
    
    const storageStatus = page.locator('[data-storage-status]');
    await expect(storageStatus).toBeVisible();
    
    const storageBar = page.locator('[data-storage-bar]');
    await expect(storageBar).toBeVisible();
    
    const storageUsage = page.locator('[data-storage-usage]');
    await expect(storageUsage).toBeVisible();
    
    const storageQuota = page.locator('[data-storage-quota]');
    await expect(storageQuota).toBeVisible();
  });

  test('diagnostics drill buttons exist', async ({ page }) => {
    await page.goto('/');
    
    const integrityDrill = page.locator('[data-db-integrity-drill]');
    await expect(integrityDrill).toBeVisible();
    
    const storageDrillFill = page.locator('[data-storage-drill-fill]');
    await expect(storageDrillFill).toBeVisible();
    
    const storageDrillCheck = page.locator('[data-storage-drill-check]');
    await expect(storageDrillCheck).toBeVisible();
  });

  test('offline indicator exists', async ({ page }) => {
    await page.goto('/');
    
    const offlineIndicator = page.locator('[data-offline-indicator]');
    await expect(offlineIndicator).toBeVisible();
  });
});
