import { chromium, webkit } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:4173/';
const headful = process.env.QA_HEADFUL === '1';
const preferredChannel = process.env.QA_CHANNEL;
const outputRoot = path.resolve('qa', 'screenshots');

const viewports = [
  { name: 'iphone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
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

const findChromiumExecutable = async () => {
  const home = process.env.HOME;
  if (!home) return null;
  const cacheDir = path.join(home, 'Library', 'Caches', 'ms-playwright');
  let entries = [];
  try {
    entries = await fs.readdir(cacheDir);
  } catch {
    return null;
  }
  const shellDirs = entries
    .filter((name) => name.startsWith('chromium_headless_shell-'))
    .sort()
    .reverse();

  const platform =
    process.platform === 'darwin'
      ? process.arch === 'arm64'
        ? 'mac-arm64'
        : 'mac-x64'
      : process.platform;

  for (const dir of shellDirs) {
    const candidate = path.join(cacheDir, dir, `chrome-headless-shell-${platform}`, 'chrome-headless-shell');
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
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
  const executablePath = await findChromiumExecutable();
  let browser;
  const launchOptions = {
    headless: !headful,
  };
  try {
    if (preferredChannel) {
      browser = await chromium.launch({ channel: preferredChannel, ...launchOptions });
    } else if (executablePath) {
      browser = await chromium.launch({ executablePath, ...launchOptions });
    } else {
      browser = await chromium.launch({ ...launchOptions });
    }
  } catch (error) {
    console.warn('[QA] Falling back to system Chrome', error?.message || error);
    try {
      browser = await chromium.launch({ channel: 'chrome', ...launchOptions });
    } catch (fallbackError) {
      console.warn('[QA] Falling back to WebKit', fallbackError?.message || fallbackError);
      browser = await webkit.launch({ headless: !headful });
    }
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
