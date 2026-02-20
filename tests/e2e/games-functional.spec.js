import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToView } from './helpers/navigate-view.js';

const emitPitchLockFeature = async (page, note = 'A') => {
    await page.evaluate(({ targetNote }) => {
        document.dispatchEvent(new CustomEvent('panda:rt-state', {
            detail: {
                paused: false,
                lastFeature: {
                    note: targetNote,
                    cents: 0,
                    hasSignal: true,
                },
            },
        }));
    }, { targetNote: note });
};

const waitForPitchQuestReady = async (page) => {
    const status = page.locator('#view-game-pitch-quest [data-pitch="status"]');
    await expect(status).toContainText('±', { timeout: 10000 });
};

const ensureLivePitchFeature = async (page, note = 'A') => {
    const liveNote = page.locator('#view-game-pitch-quest [data-pitch="live-note"]');
    await expect.poll(async () => {
        await emitPitchLockFeature(page, note);
        return (await liveNote.innerText()).trim();
    }, { timeout: 5000 }).toBe(note);
};

const lockPitchNote = async (page, note = 'A') => {
    await waitForPitchQuestReady(page);
    await ensureLivePitchFeature(page, note);
    await page.locator('#view-game-pitch-quest [data-pitch="check"]').click();
};

const dismissGameCompleteIfOpen = async (page) => {
    const completeModal = page.locator('#game-complete-modal');
    if (!(await completeModal.isVisible().catch(() => false))) return;
    const playAgain = page.locator('#game-complete-play-again');
    if (await playAgain.isVisible().catch(() => false)) {
        await playAgain.click();
    } else {
        await page.keyboard.press('Escape');
    }
    await expect(completeModal).not.toBeVisible();
};

const openGamesHub = async (page) => {
    await page.locator('.bottom-nav a[href="#view-games"]').click();
    await navigateToView(page, 'view-games', { timeout: 10000 });
};

const openPitchQuest = async (page) => {
    const pitchView = page.locator('#view-game-pitch-quest');
    const pitchLink = page.locator('a[href="#view-game-pitch-quest"]').first();

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await dismissGameCompleteIfOpen(page);
        await navigateToView(page, 'view-game-pitch-quest', { timeout: 7000 }).catch(() => {});
        await page.waitForURL('**/#view-game-pitch-quest', { timeout: 7000 }).catch(() => {});
        if (await pitchView.isVisible().catch(() => false)) {
            await dismissGameCompleteIfOpen(page);
            if (await pitchView.isVisible().catch(() => false)) {
                return;
            }
        }
        if (await pitchLink.isVisible().catch(() => false)) {
            await pitchLink.click({ timeout: 3000 }).catch(() => {});
            if (await pitchView.isVisible().catch(() => false)) {
                await dismissGameCompleteIfOpen(page);
                if (await pitchView.isVisible().catch(() => false)) {
                    return;
                }
            }
        }
        await navigateToView(page, 'view-games', { timeout: 7000 }).catch(() => {});
    }

    await navigateToView(page, 'view-game-pitch-quest', { timeout: 10000 }).catch(() => {});
    await page.waitForURL('**/#view-game-pitch-quest', { timeout: 10000 }).catch(() => {});
    await dismissGameCompleteIfOpen(page);
    await expect(pitchView).toBeVisible({ timeout: 10000 });
};

const returnToGamesFromPitchQuest = async (page) => {
    const completeModal = page.locator('#game-complete-modal');
    if (await completeModal.isVisible().catch(() => false)) {
        await page.locator('#game-complete-back').click({ timeout: 3000 }).catch(() => {});
    } else {
        await page.locator('#view-game-pitch-quest .back-btn').click({ timeout: 3000 }).catch(() => {});
    }
    await navigateToView(page, 'view-games', { timeout: 10000 });
    await dismissGameCompleteIfOpen(page);
};

test('games remain interactive after leaving and re-entering the same game', async ({ page }) => {
    test.setTimeout(60000);
    await openHome(page);

    await openGamesHub(page);
    await openPitchQuest(page);

    const firstScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    const firstBefore = Number.parseInt((await firstScore.innerText()).trim(), 10) || 0;
    await lockPitchNote(page, 'A');
    await expect.poll(async () => {
        const value = Number.parseInt((await firstScore.innerText()).trim(), 10);
        return Number.isFinite(value) ? value : firstBefore;
    }, { timeout: 5000 }).toBeGreaterThan(firstBefore);

    await returnToGamesFromPitchQuest(page);
    await openPitchQuest(page);

    const secondScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    const secondBefore = Number.parseInt((await secondScore.innerText()).trim(), 10) || 0;
    await lockPitchNote(page, 'A');
    await expect.poll(async () => {
        const value = Number.parseInt((await secondScore.innerText()).trim(), 10);
        return Number.isFinite(value) ? value : secondBefore;
    }, { timeout: 5000 }).toBeGreaterThan(secondBefore);
});
