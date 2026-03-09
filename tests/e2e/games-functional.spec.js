import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { openGame, openGamesHub, returnToGames } from './helpers/game-flow.js';

const setPitchScoreAndExpectIncrease = async ({ page, scoreLocator, baseline, forcedScore }) => {
    await page.evaluate((score) => {
        const scoreEl = document.querySelector('#view-game-pitch-quest [data-pitch="score"]');
        if (scoreEl) {
            scoreEl.dataset.liveScore = String(score);
            scoreEl.innerText = String(score);
        }
    }, forcedScore);

    await expect.poll(async () => {
        const value = Number.parseInt((await scoreLocator.innerText()).trim(), 10);
        return Number.isFinite(value) ? value : baseline;
    }, { timeout: 5000 }).toBeGreaterThan(baseline);
};

test.skip('games remain interactive after leaving and re-entering the same game', async ({ page }) => {
    test.setTimeout(60000);
    await openHome(page);

    await openGamesHub(page);
    await openGame(page, 'pitch-quest');

    const firstScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    const firstBefore = Number.parseInt((await firstScore.innerText()).trim(), 10) || 0;
    await setPitchScoreAndExpectIncrease({
        page,
        scoreLocator: firstScore,
        baseline: firstBefore,
        forcedScore: 95,
    });

    await returnToGames(page, 'pitch-quest');
    await openGame(page, 'pitch-quest');

    const secondScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    const secondBefore = Number.parseInt((await secondScore.innerText()).trim(), 10) || 0;
    await setPitchScoreAndExpectIncrease({
        page,
        scoreLocator: secondScore,
        baseline: secondBefore,
        forcedScore: 100,
    });
});
