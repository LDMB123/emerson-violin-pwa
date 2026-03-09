import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToPath } from './helpers/navigate-view.js';

const openTool = async (page, path, selector) => {
    await navigateToPath(page, path);
    await expect(page.locator(selector)).toBeVisible({ timeout: 10000 });
};

test('practice tools hub exposes the full shipped tool set', async ({ page }) => {
    await openHome(page);
    await navigateToPath(page, '/tools');

    await expect(page.locator('#view-trainer')).toBeVisible();
    await expect(page.locator('#view-trainer a[id^="tool-"]')).toHaveCount(5);
    await expect(page.locator('#tool-tuner')).toBeVisible();
    await expect(page.locator('#tool-metronome')).toBeVisible();
    await expect(page.locator('#tool-drone')).toBeVisible();
    await expect(page.locator('#tool-bowing')).toBeVisible();
    await expect(page.locator('#tool-posture')).toBeVisible();
});

test('metronome, tuner, and drone remain usable after navigation away and back', async ({ page }) => {
    await openHome(page);

    await openTool(page, '/tools/metronome', '#view-metronome');
    const metronomeToggle = page.locator('#view-metronome button:has-text("Play"), #view-metronome button:has-text("Stop")').first();
    await metronomeToggle.click();
    await expect(page.locator('#view-metronome button:has-text("Stop")')).toBeVisible({ timeout: 10000 });

    await navigateToPath(page, '/games');
    await openTool(page, '/tools/metronome', '#view-metronome');
    await expect(page.locator('#view-metronome button:has-text("Stop"), #view-metronome button:has-text("Play")')).toBeVisible();

    await openTool(page, '/tools/tuner', '#view-tuner');
    await page.locator('#view-tuner [data-ref-tone="A"]').click();
    await expect(page.locator('#view-tuner .audio-card[data-string="A"]')).toHaveClass(/is-playing/, { timeout: 10000 });

    await navigateToPath(page, '/songs');
    await openTool(page, '/tools/tuner', '#view-tuner');
    await page.locator('#view-tuner [data-ref-tone="A"]').click();
    await expect(page.locator('#view-tuner .audio-card[data-string="A"]')).toHaveClass(/is-playing/, { timeout: 10000 });

    await openTool(page, '/tools/drone', '#view-drone');
    await page.locator('#view-drone button:has-text("A4 Tone")').click();
    await expect(page.locator('#view-drone')).toContainText('A4', { timeout: 10000 });
});

test('bowing, posture, and coach runner stay functional across revisits', async ({ page }) => {
    await openHome(page);

    await openTool(page, '/tools/bowing', '#view-bowing');
    await page.locator('#bow-set-1').check();
    await expect(page.locator('#bow-set-1')).toBeChecked();

    await navigateToPath(page, '/home');
    await openTool(page, '/tools/bowing', '#view-bowing');
    await expect(page.locator('#bow-set-1')).toBeVisible();

    await openTool(page, '/tools/posture', '#view-posture');
    await page.locator('#view-posture button:has-text("Start Camera")').click();
    await expect.poll(() => page.evaluate(() => {
        const video = document.querySelector('#view-posture video');
        if (!(video instanceof HTMLVideoElement)) return false;
        return Boolean(video.srcObject || video.dataset.hasSrcObject === 'true');
    }), { timeout: 10000 }).toBe(true);

    await navigateToPath(page, '/home');
    await navigateToPath(page, '/coach');
    await expect(page.locator('#view-coach .practice-focus')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#view-coach .focus-status')).toContainText(/Ready|Left/);

    await navigateToPath(page, '/home');
    await navigateToPath(page, '/coach');
    await expect(page.locator('#view-coach .practice-focus')).toBeVisible({ timeout: 10000 });
});
