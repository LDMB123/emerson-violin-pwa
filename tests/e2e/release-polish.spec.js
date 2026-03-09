import { test, expect } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToPath } from './helpers/navigate-view.js';

const PHONE_VIEWPORT = { width: 390, height: 844 };

const VIEW_CHECKS = [
    {
        label: 'Home',
        path: '/home',
        view: '#view-home',
        headerCheck: async (page) => {
            await expect(page.locator('#view-home a[href="/settings"]')).toBeVisible();
            await expect(page.locator('[data-start-practice]')).toBeVisible();
        },
        heroSelector: '[data-home-mascot]',
        bottomTargetSelector: '#view-home a[href="/games"]',
    },
    {
        label: 'Games',
        path: '/games',
        view: '#view-games',
        headerTitle: 'Games',
        heroSelector: '[data-view-header-mascot]',
        heroVisibleOnPhone: false,
        bottomTargetSelector: '#view-games [data-game-id]',
    },
    {
        label: 'Tools',
        path: '/tools',
        view: '#view-trainer',
        headerTitle: 'Practice Tools',
        heroSelector: '[data-tools-hero-mascot]',
        bottomTargetSelector: '#tool-posture',
    },
    {
        label: 'Songs',
        path: '/songs',
        view: '#view-songs',
        headerTitle: 'Songs',
        heroSelector: '[data-view-header-mascot]',
        heroVisibleOnPhone: false,
        bottomTargetSelector: '#view-songs [data-song]',
    },
];

const attachBrowserIssueCollector = (page) => {
    const issues = [];

    page.on('console', (message) => {
        if (!['warning', 'error'].includes(message.type())) return;
        issues.push(`[${message.type()}] ${message.text()}`);
    });

    page.on('pageerror', (error) => {
        issues.push(`[pageerror] ${error.message || String(error)}`);
    });

    return {
        flush(label) {
            expect(issues, `${label} emitted browser issues`).toEqual([]);
            issues.length = 0;
        },
    };
};

const expectResolvedImage = async (page, selector, { shouldBeVisible = true } = {}) => {
    const image = page.locator(selector).first();
    await expect(image).toHaveCount(1);

    const naturalWidth = await image.evaluate((node) => node.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    if (shouldBeVisible) {
        await expect(image).toBeVisible();
    }
};

const expectHeaderLayout = async (page, title) => {
    const header = page.locator('[data-view-header]');
    await expect(header).toBeVisible();
    await expect(header.locator('h2')).toHaveText(title);
    await expect(header.locator('a')).toBeVisible();
};

const expectAboveBottomNav = async (page, selector) => {
    const target = page.locator(selector).last();
    const nav = page.locator('.bottom-nav');

    await expect(nav).toBeVisible();
    await target.evaluate((node) => {
        node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    });
    await page.waitForTimeout(100);

    const [targetBox, navBox] = await Promise.all([
        target.boundingBox(),
        nav.boundingBox(),
    ]);

    expect(targetBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(targetBox.y + targetBox.height).toBeLessThanOrEqual(navBox.y - 4);
};

const verifyReleaseSurface = async (page, check, { compact = false } = {}) => {
    await navigateToPath(page, check.path);
    await expect(page.locator(check.view)).toBeVisible({ timeout: 10000 });

    if (check.headerTitle) {
        await expectHeaderLayout(page, check.headerTitle);
    }

    if (check.headerCheck) {
        await check.headerCheck(page);
    }

    if (check.heroSelector) {
        await expectResolvedImage(page, check.heroSelector, {
            shouldBeVisible: !(compact && check.heroVisibleOnPhone === false),
        });
    }

    await expectAboveBottomNav(page, check.bottomTargetSelector);
};

const runReleasePolishSmoke = async (page, { compact = false } = {}) => {
    const issueCollector = attachBrowserIssueCollector(page);

    if (compact) {
        await page.setViewportSize(PHONE_VIEWPORT);
    }

    await openHome(page);
    await page.waitForTimeout(300);
    issueCollector.flush('Home bootstrap');

    for (const check of VIEW_CHECKS) {
        await verifyReleaseSurface(page, check, { compact });
        await page.waitForTimeout(300);
        issueCollector.flush(check.label);
    }
};

test.describe('Release polish smoke', () => {
    test('keeps tablet surfaces install-safe and visually stable', async ({ page }) => {
        await runReleasePolishSmoke(page);
    });

    test('keeps narrow phone surfaces clear of footer overlap and header regressions', async ({ page }) => {
        await runReleasePolishSmoke(page, { compact: true });
    });
});
