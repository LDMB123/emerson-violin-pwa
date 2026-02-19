import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

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

test('games remain interactive after leaving and re-entering the same game', async ({ page }) => {
    await openHome(page);

    await page.locator('.bottom-nav a[href="#view-games"]').click();
    await page.waitForURL('**/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.locator('a[href="#view-game-pitch-quest"]').click();
    await page.waitForURL('**/#view-game-pitch-quest');
    await expect(page.locator('#view-game-pitch-quest')).toBeVisible();

    const firstScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    await expect(firstScore).toHaveText('0');
    await lockPitchNote(page, 'A');
    await expect(firstScore).not.toHaveText('0');

    await page.locator('#view-game-pitch-quest .back-btn').click();
    await page.waitForURL('**/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await expect(page.locator('#game-complete-modal')).not.toBeVisible();

    await page.locator('a[href="#view-game-pitch-quest"]').click();
    await page.waitForURL('**/#view-game-pitch-quest');
    await expect(page.locator('#view-game-pitch-quest')).toBeVisible();

    const secondScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
    await expect(secondScore).toHaveText('0');
    await lockPitchNote(page, 'A');
    await expect(secondScore).not.toHaveText('0');
});
