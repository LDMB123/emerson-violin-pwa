import { expect } from '@playwright/test';

export const openHome = async (page) => {
    await page.goto('/');
    await page.waitForSelector('#main-content .view', { timeout: 10000 });

    await page.evaluate(async () => {
        const key = 'onboarding-complete';
        const fallbackKey = `panda-violin:kv:${key}`;
        localStorage.setItem(fallbackKey, JSON.stringify(true));

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
    });

    const dismissOnboardingIfVisible = async () => {
        const onboardingVisible = await page.locator('#view-onboarding').isVisible().catch(() => false);
        if (!onboardingVisible) return;
        const skipButton = page.locator('#onboarding-skip');
        const startButton = page.locator('#onboarding-start');
        if (await skipButton.isVisible().catch(() => false)) {
            await skipButton.click();
        } else if (await startButton.isVisible().catch(() => false)) {
            await startButton.click();
        }
        await page.waitForURL('**/#view-home', { timeout: 10000 }).catch(() => {});
    };

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await dismissOnboardingIfVisible();

        if (await page.locator('#view-home').isVisible().catch(() => false)) {
            return;
        }

        // Force a home-route navigation to recover from early hashchange races.
        await page.goto('/#view-home', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#main-content .view', { timeout: 10000 });
    }

    await expect(page.locator('#view-home')).toBeVisible({ timeout: 10000 });
};
