import { expect } from '@playwright/test';

export const openHome = async (page) => {
    await page.goto('/#view-home', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#main-content', { timeout: 10000 });

    await page.evaluate(async () => {
        const key = 'onboarding-complete';
        const uiStateKey = 'panda-violin:ui-state:v1';
        const fallbackKey = `panda-violin:kv:${key}`;
        const uiStateFallbackKey = `panda-violin:kv:${uiStateKey}`;
        localStorage.setItem(fallbackKey, JSON.stringify(true));
        localStorage.setItem(uiStateFallbackKey, JSON.stringify({
            checks: { 'setting-sounds': true },
            radios: {},
        }));

        await new Promise((resolve) => {
            const request = indexedDB.open('panda-violin-db', 2);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('kv')) {
                    db.createObjectStore('kv');
                }
                if (!db.objectStoreNames.contains('blobs')) {
                    db.createObjectStore('blobs');
                }
            };

            request.onerror = () => resolve();
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('kv', 'readwrite');
                tx.objectStore('kv').put(true, key);
                tx.objectStore('kv').put({
                    checks: { 'setting-sounds': true },
                    radios: {},
                }, uiStateKey);
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    db.close();
                    resolve();
                };
                tx.onabort = () => {
                    db.close();
                    resolve();
                };
            };
        });

        document.documentElement.dataset.sounds = 'on';
        document.dispatchEvent(new CustomEvent('panda:sounds-change', { detail: { enabled: true } }));
    });

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
