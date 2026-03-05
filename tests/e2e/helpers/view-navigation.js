import { expect } from '@playwright/test';
import { navigateToView } from './navigate-view.js';

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
    const viewId = String(viewHash || '#view-home').replace(/^#/, '');
    await navigateToView(page, viewId, { timeout });
    await expect(page.locator(`#${viewId}`)).toBeVisible({ timeout });
};
