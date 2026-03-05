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

export const gotoView = async (page, view, options = {}) => {
    const raw = String(view || '#view-home');
    if (raw.startsWith('#')) {
        return gotoAndExpectView(page, raw, options);
    }
    return gotoAndExpectView(page, raw.startsWith('view-') ? `#${raw}` : `#view-${raw}`, options);
};

export const goHome = async (page, options = {}) => gotoAndExpectView(page, '#view-home', options);
export const goParent = async (page, options = {}) => gotoAndExpectView(page, '#view-parent', options);
