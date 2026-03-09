import { expect, test } from '@playwright/test';
import { collectBrowserIssues } from './helpers/browser-issues.js';

test('deployed site serves core assets and child-facing routes without runtime errors', async ({ page, request, baseURL }) => {
    test.skip(!baseURL, 'PW_BASE_URL or PLAYWRIGHT_BASE_URL is required for live smoke runs.');

    const issues = collectBrowserIssues(page, { ignoreLocalModuleLoadNoise: true });
    const rootUrl = new URL(baseURL);
    const routeUrl = (path) => new URL(path.replace(/^\//, ''), rootUrl).toString();

    await page.addInitScript(() => {
        try {
            localStorage.setItem('onboarding-complete', 'true');
            localStorage.setItem('e2e-skip-permissions', 'true');
        } catch {
            // Ignore storage access errors in smoke setup.
        }
    });

    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 15000 });

    const manifestUrl = new URL('manifest.webmanifest', baseURL).toString();
    const swUrl = new URL('sw.js', baseURL).toString();

    const manifestResponse = await request.get(manifestUrl);
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);

    const swResponse = await request.get(swUrl);
    expect(swResponse.ok()).toBeTruthy();
    expect(await swResponse.text()).toContain('self.addEventListener');

    await page.goto(routeUrl('/home'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#view-home')).toBeVisible({ timeout: 15000 });

    await page.goto(routeUrl('/songs'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#view-songs')).toBeVisible({ timeout: 15000 });
    await page.goto(routeUrl('/songs/mary'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#view-song-mary')).toBeVisible({ timeout: 15000 });

    await page.goto(routeUrl('/games'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#view-games')).toBeVisible({ timeout: 15000 });
    await page.goto(routeUrl('/games/pitch-quest'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#view-game-pitch-quest')).toBeVisible({ timeout: 15000 });

    await page.goto(routeUrl('/tools'), { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#view-trainer')).toBeVisible({ timeout: 15000 });

    expect(issues.pageErrors).toEqual([]);
    expect(issues.consoleErrors).toEqual([]);
});
