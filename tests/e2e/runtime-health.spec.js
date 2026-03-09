import { expect, test } from '@playwright/test';
import { collectBrowserIssues } from './helpers/browser-issues.js';
import { openHome } from './helpers/open-home.js';
import { navigateToPath } from './helpers/navigate-view.js';

test('critical views should not emit runtime page or console errors', async ({ page }) => {
    const issues = collectBrowserIssues(page, { ignoreLocalModuleLoadNoise: true });
    await openHome(page);

    const criticalPaths = [
        '/home',
        '/coach',
        '/games',
        '/games/pitch-quest',
        '/games/ear-trainer',
        '/songs',
        '/songs/mary',
        '/songs/mary/play',
        '/tools',
        '/tools/tuner',
        '/tools/bowing',
        '/tools/posture',
        '/wins',
        '/parent',
        '/parent/review',
        '/backup',
        '/settings',
        '/support/help',
        '/support/about',
        '/support/privacy',
    ];

    for (const path of criticalPaths) {
        await navigateToPath(page, path);
        await page.waitForTimeout(250);
    }

    expect(issues.pageErrors).toEqual([]);
    expect(issues.consoleErrors).toEqual([]);
});
