import { expect } from '@playwright/test';
import { navigateToView } from './navigate-view.js';

export const readNumericValue = async (locator) => {
    const raw = await locator.innerText();
    const numeric = Number.parseFloat(raw.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
};

export const dispatchGameRecordedEvent = async (page, gameId, score) => {
    await page.evaluate(({ id, s }) => {
        document.dispatchEvent(new CustomEvent('panda:game-recorded', {
            detail: { id, score: s },
        }));
    }, { id: gameId, s: score });
};

export const openGamesHub = async (page) => {
    await navigateToView(page, 'view-games', { timeout: 10000 });
};

const ensureGamesHubVisible = async (page) => {
    const gamesView = page.locator('#view-games');
    if (await gamesView.isVisible().catch(() => false)) return;
    await page.goto('/games', { waitUntil: 'commit', timeout: 10000 }).catch(() => undefined);
    await expect(gamesView).toBeVisible({ timeout: 10000 });
};

export const dismissGameCompleteIfOpen = async (page) => {
    await page.evaluate(() => document.getElementById('exit-confirm-modal')?.close());
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

const settleTargetView = async (page, targetView) => {
    if (!(await targetView.isVisible().catch(() => false))) return false;
    await dismissGameCompleteIfOpen(page);
    return targetView.isVisible().catch(() => false);
};

const activateGameShellIfNeeded = async (page, gameId) => {
    const startButton = page.locator(`#view-game-${gameId} button:has-text("Start Game")`).first();
    if (!(await startButton.isVisible().catch(() => false))) {
        return;
    }

    await startButton.click({ force: true }).catch(() => undefined);
    await expect(startButton).not.toBeVisible({ timeout: 10000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
};

export const openGame = async (page, gameId) => {
    const targetViewId = `view-game-${gameId}`;
    const targetView = page.locator(`#${targetViewId}`);
    const gameLink = page.locator(`a[href="/games/${gameId}"]`).first();

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await dismissGameCompleteIfOpen(page);
        await ensureGamesHubVisible(page).catch(() => undefined);
        await navigateToView(page, targetViewId, { timeout: 7000 }).catch(() => undefined);
        await page.waitForURL(`**/games/${gameId}`, { timeout: 7000 }).catch(() => undefined);
        if (await settleTargetView(page, targetView)) {
            await activateGameShellIfNeeded(page, gameId);
            return;
        }
        if (await gameLink.isVisible().catch(() => false)) {
            await gameLink.click({ timeout: 3000 }).catch(() => undefined);
            if (await settleTargetView(page, targetView)) {
                await activateGameShellIfNeeded(page, gameId);
                return;
            }
        }
        await ensureGamesHubVisible(page).catch(() => undefined);
    }

    await navigateToView(page, targetViewId, { timeout: 10000 }).catch(() => undefined);
    await page.waitForURL(`**/games/${gameId}`, { timeout: 10000 }).catch(() => undefined);
    await dismissGameCompleteIfOpen(page);
    if (!(await targetView.isVisible().catch(() => false))) {
        await ensureGamesHubVisible(page);
        await gameLink.click({ timeout: 5000 }).catch(() => undefined);
    }
    await expect(targetView).toBeVisible({ timeout: 10000 });
    await dismissGameCompleteIfOpen(page);

    await activateGameShellIfNeeded(page, gameId);

    await page.evaluate((id) => {
        const view = document.getElementById(id);
        if (!view) return;
        const stage = view.querySelector('.game-stage') || view.querySelector('.game-content');
        if (stage) stage.dataset.session = 'active';
    }, targetViewId);
};

export const returnToGames = async (page, gameId) => {
    const completeModal = page.locator('#game-complete-modal');
    try {
        if (await completeModal.isVisible().catch(() => false)) {
            await page.locator('#game-complete-back').click({ timeout: 1500 });
        } else if (await page.locator(`#view-game-${gameId} button:has-text("Exit")`).isVisible().catch(() => false)) {
            await page.locator(`#view-game-${gameId} button:has-text("Exit")`).click({ timeout: 1500 });
        } else {
            await page.locator(`#view-game-${gameId} .back-btn`).click({ timeout: 1500 });
        }
    } catch {
        if (await completeModal.isVisible().catch(() => false)) {
            await page.locator('#game-complete-back').click().catch(() => undefined);
        }
    }

    await page.goto('/games', { waitUntil: 'commit', timeout: 10000 }).catch(() => undefined);
    await ensureGamesHubVisible(page);
    await dismissGameCompleteIfOpen(page);
};
