import { expect } from '@playwright/test';
import { navigateToView, navigateToPath } from './navigate-view.js';

export const setParentUnlocked = async (page, unlocked) => {
    if (page.url() === 'about:blank') {
        await page.goto('/');
    }
    await page.evaluate((value) => {
        if (value) {
            sessionStorage.setItem('panda-violin:parent-unlocked', 'true');
            return;
        }
        sessionStorage.removeItem('panda-violin:parent-unlocked');
    }, Boolean(unlocked));
};

export const gotoAndExpectPath = async (page, pathname, { timeout = 10000 } = {}) => {
    await navigateToPath(page, pathname, { timeout });
    // Since we don't have a reliable single container ID like we did with hash routes, 
    // we just rely on navigation success or provide an optional selector to wait for.
};

export const gotoAndExpectView = async (page, viewOrPath, { timeout = 10000 } = {}) => {
    const rawPath = String(viewOrPath || '#view-home').replace(/^#/, '');
    if (rawPath.startsWith('/')) {
        await gotoAndExpectPath(page, rawPath, { timeout });
        return;
    }
    const viewId = rawPath;
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
