import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToView } from './helpers/navigate-view.js';

const isTransientNavigationError = (error) => /Execution context was destroyed|Cannot find context with specified id|Target page, context or browser has been closed/i.test(String(error));

const waitForResponsiveLayout = async (page) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.waitForLoadState('domcontentloaded');
      await page.evaluate(async () => {
        const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

        if (document.fonts?.ready) {
          try {
            await document.fonts.ready;
          } catch {}
        }

        await waitFrame();
        await waitFrame();
      });
      return;
    } catch (error) {
      if (!isTransientNavigationError(error) || attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(50);
    }
  }
};

const assertNoHorizontalOverflow = async (page) => {
  await expect
    .poll(async () => {
      try {
        await waitForResponsiveLayout(page);
        return await page.evaluate(() => {
          const htmlOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
          const bodyOverflow = Math.max(0, document.body.scrollWidth - document.body.clientWidth);
          return Math.max(htmlOverflow, bodyOverflow);
        });
      } catch (error) {
        if (isTransientNavigationError(error)) {
          return Number.MAX_SAFE_INTEGER;
        }
        throw error;
      }
    }, { timeout: 5000 })
    .toBeLessThanOrEqual(1);
};

test('captures iPad and phone layouts for core child views', async ({ page }, testInfo) => {
  await openHome(page);

  const viewports = [
    { name: 'ipad', width: 834, height: 1194 },
    { name: 'phone', width: 390, height: 844 },
  ];

  const routes = [
    { name: 'home', hash: '#view-home', selector: '#view-home' },
    { name: 'coach', hash: '#view-coach', selector: '#view-coach' },
    { name: 'games', hash: '#view-games', selector: '#view-games' },
    { name: 'songs', hash: '#view-songs', selector: '#view-songs' },
    { name: 'progress', hash: '#view-progress', selector: '#view-progress' },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of routes) {
      await navigateToView(page, route.hash);
      await expect(page.locator(route.selector)).toBeVisible({ timeout: 10000 });
      await assertNoHorizontalOverflow(page);

      await page.screenshot({
        path: testInfo.outputPath(`${viewport.name}-${route.name}.png`),
        fullPage: true,
      });
    }
  }
});
