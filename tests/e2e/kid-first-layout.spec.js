import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToView } from './helpers/navigate-view.js';

const assertNoHorizontalOverflow = async (page) => {
  const hasOverflow = await page.evaluate(() => {
    const htmlOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const bodyOverflow = document.body.scrollWidth - document.body.clientWidth;
    return htmlOverflow > 1 || bodyOverflow > 1;
  });
  expect(hasOverflow).toBe(false);
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
