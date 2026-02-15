import { expect, test } from '@playwright/test';

const CRITICAL_AUDIO_ASSETS = [
    'assets/audio/violin-a4.wav',
    'assets/audio/violin-g3.wav',
    'assets/audio/violin-d4.wav',
    'assets/audio/violin-e5.wav',
    'assets/audio/metronome-60.wav',
    'assets/audio/metronome-90.wav',
    'assets/audio/metronome-120.wav',
];

const ensureServiceWorkerControl = async (page) => {
    await page.evaluate(() => navigator.serviceWorker.ready);

    try {
        await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 5000 });
    } catch {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 10000 });
    }
};

test('progress path has no BigInt conversion errors and can serve critical audio offline', async ({ page, context }) => {
    const errors = [];

    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });
    page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));

    await page.goto('/');
    await expect(page).toHaveTitle(/Panda Violin/);

    await ensureServiceWorkerControl(page);

    const onlineChecks = await page.evaluate(async (assets) => {
        const results = [];
        for (const asset of assets) {
            try {
                const response = await fetch(`/${asset}`, { method: 'GET' });
                results.push({
                    asset,
                    status: response.status,
                    ok: response.ok,
                    type: response.type,
                });
            } catch (error) {
                results.push({
                    asset,
                    error: String(error),
                });
            }
        }
        return results;
    }, CRITICAL_AUDIO_ASSETS);

    await ensureServiceWorkerControl(page);

    await context.setOffline(true);

    const offlineChecks = await page.evaluate(async (assets) => {
        const results = [];
        for (const asset of assets) {
            try {
                const response = await fetch(`/${asset}`, { method: 'GET' });
                results.push({
                    asset,
                    status: response.status,
                    ok: response.ok,
                    type: response.type,
                });
            } catch (error) {
                results.push({
                    asset,
                    error: String(error),
                });
            }
        }
        return results;
    }, CRITICAL_AUDIO_ASSETS);

    const hasBigIntError = errors.some((entry) => entry.includes('Cannot convert') && entry.includes('to a BigInt'));
    const hasTrackerError = errors.some((entry) => entry.includes('achievementtracker') || entry.includes('check_progress'));

    expect(hasBigIntError).toBe(false);
    expect(hasTrackerError).toBe(false);
    expect(onlineChecks.every((check) => check.status === 200 && check.ok)).toBe(true);
    expect(offlineChecks.every((check) => check.status === 200 && check.ok)).toBe(true);
});
