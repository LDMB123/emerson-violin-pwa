import { expect } from '@playwright/test';
import { seedKVValue } from './seed-kv.js';
import { forceSoundsOn } from './sound-state.js';

export const openHome = async (page) => {
    await page.goto('/#view-home', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#main-content', { timeout: 10000 });

    const uiState = {
        checks: { 'setting-sounds': true },
        radios: {},
    };
    await seedKVValue(page, 'onboarding-complete', true).catch(() => {});
    await seedKVValue(page, 'panda-violin:ui-state:v1', uiState).catch(() => {});

    await forceSoundsOn(page);

    const dismissOnboardingIfVisible = async () => {
        const onboardingVisible = await page.locator('#view-onboarding').isVisible().catch(() => false);
        if (!onboardingVisible) return;
        const skipButton = page.locator('#onboarding-skip');
        const startButton = page.locator('#onboarding-start');
        if (await skipButton.isVisible().catch(() => false)) {
            await skipButton.click().catch(() => {});
        } else if (await startButton.isVisible().catch(() => false)) {
            await startButton.click().catch(() => {});
        }
        await page.waitForFunction(() => {
            const onboarding = document.getElementById('view-onboarding');
            return !onboarding || onboarding.hidden || window.location.hash === '#view-home';
        }, { timeout: 3000 }).catch(() => {});
    };

    await dismissOnboardingIfVisible();
    await page.waitForFunction(() => window.__PANDA_APP_READY__ === true, { timeout: 10000 }).catch(() => {});

    if (!(await page.locator('#view-home').isVisible().catch(() => false))) {
        await page.goto('/#view-home', { waitUntil: 'domcontentloaded', timeout: 6000 });
    }

    await expect(page.locator('#view-home')).toBeVisible({ timeout: 6000 });
};
