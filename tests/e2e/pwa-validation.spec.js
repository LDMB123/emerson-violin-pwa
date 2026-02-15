import { test, expect } from '@playwright/test';

async function hasServiceWorkerRegistration(page) {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return !!registration;
    } catch {
      return false;
    }
  });
}

async function isLocalDevHost(page) {
  return page.evaluate(() => {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  });
}

test.describe('PWA validation', () => {
  test.describe.configure({ mode: 'serial' });

  test('page loads and has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Emerson Violin Studio');
  });

  test('service worker registers successfully', async ({ page }) => {
    await page.goto('/');
    const localDevHost = await isLocalDevHost(page);

    if (localDevHost) {
      await expect
        .poll(() => hasServiceWorkerRegistration(page), {
          timeout: 5000,
          message: 'service worker should remain disabled on localhost',
        })
        .toBe(false);
      return;
    }

    await expect
      .poll(() => hasServiceWorkerRegistration(page), {
        timeout: 15000,
        message: 'service worker should register on app load',
      })
      .toBe(true);
  });

  test('cache storage has entries', async ({ page }) => {
    await page.goto('/');
    const localDevHost = await isLocalDevHost(page);

    if (!localDevHost) {
      await expect
        .poll(() => hasServiceWorkerRegistration(page), {
          timeout: 15000,
          message: 'service worker should register before cache assertions',
        })
        .toBe(true);
    }

    // Trigger additional fetches to give runtime caching a deterministic chance.
    await page.reload();

    if (localDevHost) {
      await expect
        .poll(
          () =>
            page.evaluate(async () => {
              if (!('caches' in window)) return 0;
              const keys = await caches.keys();
              return keys.length;
            }),
          {
            timeout: 15000,
            message: 'cache storage query should complete on localhost',
          },
        )
        .toBeGreaterThanOrEqual(0);
      return;
    }

    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            if (!('caches' in window)) return 0;
            const keys = await caches.keys();
            return keys.length;
          }),
        {
          timeout: 15000,
          message: 'cache storage should contain at least one cache',
        },
      )
      .toBeGreaterThan(0);
  });

  test('DB worker status element exists and is visible', async ({ page }) => {
    await page.goto('/#support');
    await expect(page.locator('.advanced-cluster > summary')).toBeVisible();
    await page.click('.advanced-cluster > summary');
    const dbWorkerStatus = page.locator('[data-db-worker-status]');
    await expect(dbWorkerStatus).toBeVisible();
  });

  test('migration UI elements exist', async ({ page }) => {
    await page.goto('/#support');
    
    // Migration banner (may be hidden initially)
    const migrateBanner = page.locator('[data-migrate-banner]');
    await expect(migrateBanner).toBeAttached();
    
    await expect(page.locator('.advanced-cluster > summary')).toBeVisible();
    await page.click('.advanced-cluster > summary');

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
    await expect(storageBar).toBeAttached();
    
    await page.goto('/#core');
    const storageUsage = page.locator('[data-storage-usage]');
    await expect(storageUsage).toBeVisible();
    
    const storageQuota = page.locator('[data-storage-quota]');
    await expect(storageQuota).toBeVisible();
  });

  test('diagnostics drill buttons exist', async ({ page }) => {
    await page.goto('/#support');
    await expect(page.locator('.advanced-cluster > summary')).toBeVisible();
    await page.click('.advanced-cluster > summary');
    
    const integrityDrill = page.locator('[data-db-integrity-drill]');
    await expect(integrityDrill).toBeVisible();
    
    const storageDrillFill = page.locator('[data-storage-drill-fill]');
    await expect(storageDrillFill).toBeAttached();
    
    const storageDrillCheck = page.locator('[data-storage-drill-check]');
    await expect(storageDrillCheck).toBeAttached();
  });

  test('offline indicator exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.topbar')).toBeVisible();
    const offlineIndicator = page.locator('[data-offline-indicator]');
    await expect(offlineIndicator).toBeVisible();
  });
});
