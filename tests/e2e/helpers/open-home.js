import { expect } from '@playwright/test';
import { seedKVValue } from './seed-kv.js';
import { forceSoundsOn } from './sound-state.js';

export const openHome = async (page) => {
    // Mock navigator.permissions.query for Safari/WebKit tests to bypass explicit permission gates
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'permissions', {
            value: { query: () => Promise.resolve({ state: 'granted', onchange: null }) },
            configurable: true
        });
    });

    // Navigate home natively
    await page.goto('/', { waitUntil: 'commit' }).catch(() => { });

    // Wipe local caches but immediately force onboarding flags to prevent React intercept
    await page.evaluate(() => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('onboarding-complete', 'true');
            localStorage.setItem('e2e-skip-permissions', 'true');
        } catch (e) { }
    });

    const uiState = {
        checks: { 'setting-sounds': true },
        radios: {},
    };
    await seedKVValue(page, 'panda-violin:ui-state:v1', uiState).catch(() => { });

    await forceSoundsOn(page);

    // Hard reload the browser context to ensure AppShell reads the populated storage flags
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
    await expect(page.locator('#view-home')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('#main-content', { timeout: 10000 });
};
