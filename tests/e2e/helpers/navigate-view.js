import { expect } from '@playwright/test';

const normalizeViewId = (view) => {
    if (!view) return 'view-home';
    const raw = String(view).replace(/^#/, '');
    return raw.startsWith('view-') ? raw : `view-${raw}`;
};

const isViewVisible = async (page, viewId) => {
    return page.locator(`#${viewId}`).isVisible().catch(() => false);
};

export const navigateToView = async (page, view, { timeout = 10000 } = {}) => {
    const viewId = normalizeViewId(view);
    const hash = `#${viewId}`;
    const url = `/${hash}`;
    const selector = page.locator(`#${viewId}`);

    const attempts = [
        async () => {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
        },
        async () => {
            await page.evaluate((nextHash) => {
                window.location.hash = nextHash;
            }, hash);
        },
        async () => {
            await page.evaluate((nextHash) => {
                if (window.location.hash === nextHash) {
                    window.location.hash = '#view-home';
                }
                window.location.hash = nextHash;
            }, hash);
        },
    ];

    for (const runAttempt of attempts) {
        await runAttempt().catch(() => {});
        await page.waitForURL(`**/${hash}`, { timeout }).catch(() => {});
        if (await isViewVisible(page, viewId)) {
            await expect(selector).toBeVisible({ timeout });
            return;
        }
    }

    await expect(selector).toBeVisible({ timeout });
};
