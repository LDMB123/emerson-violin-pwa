import { expect } from '@playwright/test';

export const setParentUnlocked = async (page, unlocked) => {
    await page.evaluate((value) => {
        if (value) {
            sessionStorage.setItem('panda-violin:parent-unlocked', 'true');
            return;
        }
        sessionStorage.removeItem('panda-violin:parent-unlocked');
    }, Boolean(unlocked));
};

export const gotoAndExpectView = async (page, viewHash, { timeout = 10000 } = {}) => {
    await page.goto(`/${viewHash}`);
    await expect(page.locator(viewHash)).toBeVisible({ timeout });
};

