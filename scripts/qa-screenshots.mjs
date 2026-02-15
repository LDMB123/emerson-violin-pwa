import { webkit } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:4173/';
const headful = process.env.QA_HEADFUL === '1';
const outputRoot = path.resolve('qa', 'screenshots');

const viewports = [
  { name: 'ipad', width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: false },
];

const routes = [
  { name: 'home', hash: '#view-home' },
  { name: 'games', hash: '#view-games' },
  { name: 'songs', hash: '#view-songs' },
  { name: 'trainer', hash: '#view-trainer' },
  { name: 'tuner', hash: '#view-tuner' },
  { name: 'coach', hash: '#view-coach' },
  { name: 'progress', hash: '#view-progress' },
  { name: 'analysis', hash: '#view-analysis' },
  { name: 'parent', hash: '#view-parent' },
  { name: 'more', hash: '#view-home', action: 'open-more' },
];

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const captureView = async (page, route, outputPath) => {
  await page.goto(`${baseUrl}${route.hash}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  if (route.action === 'open-more') {
    const trigger = page.locator('button[popovertarget="more-menu"]');
    if (await trigger.count()) {
      await trigger.first().click();
      await page.waitForTimeout(200);
    }
  }

  await page.screenshot({ path: outputPath, fullPage: true });
};

const run = async () => {
  await ensureDir(outputRoot);
  let browser;
  const launchOptions = {
    headless: !headful,
  };
  try {
    browser = await webkit.launch({ ...launchOptions });
  } catch (error) {
    throw new Error(`[QA] Failed to launch WebKit browser: ${error?.message || error}`);
  }

  for (const viewport of viewports) {
    const deviceDir = path.join(outputRoot, viewport.name);
    await ensureDir(deviceDir);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: true,
      colorScheme: 'light',
    });

    const page = await context.newPage();

    page.on('pageerror', (error) => {
      console.warn(`[QA] Page error: ${error.message}`);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.warn(`[QA] Console error: ${msg.text()}`);
      }
    });

    for (const route of routes) {
      const outputPath = path.join(deviceDir, `${route.name}.png`);
      await captureView(page, route, outputPath);
    }

    await context.close();
  }

  await browser.close();
};

run().catch((error) => {
  console.error('[QA] Screenshot capture failed', error);
  process.exitCode = 1;
});
