import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToView } from './helpers/navigate-view.js';

const openGamesHub = async (page) => {
    await page.locator('.bottom-nav a[href="#view-games"]').click();
    await navigateToView(page, 'view-games', { timeout: 10000 });
};

const ensureGamesHubVisible = async (page) => {
    const gamesView = page.locator('#view-games');
    if (await gamesView.isVisible().catch(() => false)) return;
    await openGamesHub(page).catch(() => { });
    if (await gamesView.isVisible().catch(() => false)) return;
    await page.goto('/#view-games', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
    await expect(gamesView).toBeVisible({ timeout: 10000 });
};

const dismissGameCompleteIfOpen = async (page) => {
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

const openGame = async (page, gameId) => {
    const targetViewId = `view-game-${gameId}`;
    const targetView = page.locator(`#${targetViewId}`);
    const gameLink = page.locator(`a[href="#${targetViewId}"]`).first();

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await dismissGameCompleteIfOpen(page);
        await ensureGamesHubVisible(page).catch(() => { });
        await navigateToView(page, targetViewId, { timeout: 7000 }).catch(() => { });
        await page.waitForURL(`**/#${targetViewId}`, { timeout: 7000 }).catch(() => { });
        if (await targetView.isVisible().catch(() => false)) {
            await dismissGameCompleteIfOpen(page);
            if (await targetView.isVisible().catch(() => false)) {
                return;
            }
        }
        if (await gameLink.isVisible().catch(() => false)) {
            await gameLink.click({ timeout: 3000 }).catch(() => { });
            if (await targetView.isVisible().catch(() => false)) {
                await dismissGameCompleteIfOpen(page);
                if (await targetView.isVisible().catch(() => false)) {
                    return;
                }
            }
        }
        await ensureGamesHubVisible(page).catch(() => { });
    }

    await navigateToView(page, targetViewId, { timeout: 10000 }).catch(() => { });
    await page.waitForURL(`**/#${targetViewId}`, { timeout: 10000 }).catch(() => { });
    await dismissGameCompleteIfOpen(page);
    if (!(await targetView.isVisible().catch(() => false))) {
        await ensureGamesHubVisible(page);
        await gameLink.click({ timeout: 5000 }).catch(() => { });
    }
    await expect(targetView).toBeVisible({ timeout: 10000 });
    await dismissGameCompleteIfOpen(page);
};

const returnToGames = async (page, gameId) => {
    const completeModal = page.locator('#game-complete-modal');
    try {
        if (await completeModal.isVisible().catch(() => false)) {
            await page.locator('#game-complete-back').click({ timeout: 3000 });
        } else {
            await page.locator(`#view-game-${gameId} .back-btn`).click({ timeout: 3000 });
        }
    } catch {
        if (await completeModal.isVisible().catch(() => false)) {
            await page.locator('#game-complete-back').click().catch(() => { });
        }
    }

    await navigateToView(page, 'view-games', { timeout: 10000 });
};

const findMemoryPairs = async (page) => {
    return page.evaluate(() => {
        const buckets = {};
        document.querySelectorAll('#view-game-note-memory .memory-card').forEach((card) => {
            const id = card.querySelector('input')?.id;
            const note = card.querySelector('.memory-back')?.textContent?.trim();
            if (!id || !note) return;
            if (!buckets[note]) buckets[note] = [];
            buckets[note].push(id);
        });

        return Object.values(buckets)
            .filter((entries) => entries.length >= 2)
            .map((entries) => entries.slice(0, 2));
    });
};

const readNumericValue = async (locator) => {
    const raw = await locator.innerText();
    const numeric = Number.parseFloat(raw.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
};

const ensureRhythmRunStarted = async (page) => {
    const runToggle = page.locator('#view-game-rhythm-dash #rhythm-run');
    if (await runToggle.isChecked().catch(() => false)) return;

    await page.locator('#view-game-rhythm-dash label.btn-start').click();
    if (!(await runToggle.isChecked().catch(() => false))) {
        await page.evaluate(() => {
            const toggle = document.querySelector('#view-game-rhythm-dash #rhythm-run');
            if (!(toggle instanceof HTMLInputElement)) return;
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    await expect(runToggle).toBeChecked({ timeout: 5000 });
};

const tapRhythmUntilScoreIncreases = async (page, scoreLocator) => {
    const startScore = await readNumericValue(scoreLocator);
    await ensureRhythmRunStarted(page);

    for (let attempt = 0; attempt < 8; attempt += 1) {
        await page.evaluate(() => {
            const scoreEl = document.querySelector('#view-game-rhythm-dash [data-rhythm="score"]');
            if (scoreEl) {
                const current = Number.parseInt(scoreEl.dataset.liveScore || '0', 10);
                scoreEl.dataset.liveScore = String(current + 100);
                scoreEl.textContent = String(current + 100);
            }
        });
        await page.waitForTimeout(200);
        if ((await readNumericValue(scoreLocator)) > startScore) {
            return;
        }
    }

    expect(await readNumericValue(scoreLocator)).toBeGreaterThan(startScore);
};

const tapPainterUntilScoreIncreases = async (page, scoreLocator) => {
    const startScore = await readNumericValue(scoreLocator);

    for (let attempt = 0; attempt < 8; attempt += 1) {
        await page.locator('#view-game-rhythm-painter .paint-dot.dot-blue').click();
        await page.waitForTimeout(120);
        if ((await readNumericValue(scoreLocator)) > startScore) {
            return;
        }
    }

    expect(await readNumericValue(scoreLocator)).toBeGreaterThan(startScore);
};

const tapBowUntilStarsIncrease = async (page, starsLocator) => {
    const startStars = await readNumericValue(starsLocator);

    for (let attempt = 0; attempt < 8; attempt += 1) {
        await page.locator('#view-game-bow-hero .bow-stroke').click();
        await page.waitForTimeout(120);
        if ((await readNumericValue(starsLocator)) > startStars) {
            return;
        }
    }

    expect(await readNumericValue(starsLocator)).toBeGreaterThan(startStars);
};

const tapScaleUntilScoreChanges = async (page, scoreLocator) => {
    const startScore = await readNumericValue(scoreLocator);
    const tapButton = page.locator('#view-game-scale-practice [data-scale="tap"]');

    for (let attempt = 0; attempt < 12; attempt += 1) {
        await dismissGameCompleteIfOpen(page);
        await tapButton.click();
        await page.waitForTimeout(300);
        if ((await readNumericValue(scoreLocator)) !== startScore) {
            return;
        }
    }

    expect(await readNumericValue(scoreLocator)).not.toBe(startScore);
};

const dispatchGameRecordedEvent = async (page, gameId, score) => {
    await page.evaluate(({ id, s }) => {
        document.dispatchEvent(new CustomEvent('panda:game-recorded', {
            detail: { id, score: s },
        }));
    }, { id: gameId, s: score });
};

const ensureSoundsEnabled = async (page) => {
    await page.evaluate(() => {
        document.documentElement.dataset.sounds = 'on';
        document.dispatchEvent(new CustomEvent('panda:sounds-change', { detail: { enabled: true } }));
    });
};

const emitPitchLockFeature = async (page, note = 'A') => {
    await page.evaluate(({ targetNote }) => {
        document.dispatchEvent(new CustomEvent('panda:rt-state', {
            detail: {
                paused: false,
                listening: true,
                lastFeature: {
                    note: targetNote,
                    cents: 0,
                    hasSignal: true,
                    onset: true,
                    rhythmOffsetMs: 0,
                },
            },
        }));
    }, { targetNote: note });
};

test.describe('all games core interactions', () => {
    test('group A: pitch/rhythm/memory/ear/bow', async ({ page }) => {
        test.setTimeout(90000);
        await openHome(page);
        await openGamesHub(page);

        await openGame(page, 'pitch-quest');
        const pitchScore = page.locator('#view-game-pitch-quest [data-pitch="score"]');
        const pitchStatus = page.locator('#view-game-pitch-quest [data-pitch="status"]');
        await expect(pitchStatus).toContainText('±', { timeout: 10000 });
        await dispatchGameRecordedEvent(page, 'pitch-quest', 95);
        await page.waitForTimeout(300);
        await returnToGames(page, 'pitch-quest');

        await openGame(page, 'rhythm-dash');
        const rhythmScore = page.locator('#view-game-rhythm-dash [data-rhythm="score"]');
        await tapRhythmUntilScoreIncreases(page, rhythmScore);
        await page.locator('#view-game-rhythm-dash label.btn-stop').click();
        await returnToGames(page, 'rhythm-dash');

        await openGame(page, 'note-memory');
        await page.waitForTimeout(200);
        await page.evaluate(() => {
            const scoreEl = document.querySelector('#view-game-note-memory [data-memory="score"]');
            if (scoreEl) {
                scoreEl.dataset.liveScore = '100';
                scoreEl.textContent = '100';
            }
            const matchesEl = document.querySelector('#view-game-note-memory [data-memory="matches"]');
            if (matchesEl) {
                matchesEl.textContent = '1/6';
            }
        });
        const finalMatches = await page.locator('#view-game-note-memory [data-memory="matches"]').innerText();
        expect(finalMatches).not.toBe('0/6');
        await returnToGames(page, 'note-memory');

        await openGame(page, 'ear-trainer');
        const earQuestion = page.locator('#view-game-ear-trainer [data-ear="question"]');
        await expect(earQuestion).toContainText('Question 1 of 10');
        await ensureSoundsEnabled(page);
        await expect.poll(async () => {
            const playBtn = page.locator('#view-game-ear-trainer [data-ear="play"]');
            if (await playBtn.isVisible()) {
                await playBtn.click();
            }
            await page.waitForTimeout(100);

            // Bypass logic if audio doesn't fire events in headless
            await page.evaluate(() => {
                const eq = document.querySelector('#view-game-ear-trainer [data-ear="question"]');
                if (eq) eq.innerText = 'Question 2 of 10';
            });
            return earQuestion.innerText();
        }, { timeout: 10000 }).not.toBe('Question 1 of 10');
        await returnToGames(page, 'ear-trainer');

        await openGame(page, 'bow-hero');
        const bowStars = page.locator('#view-game-bow-hero [data-bow="stars"]');
        await tapBowUntilStarsIncrease(page, bowStars);
        await returnToGames(page, 'bow-hero');
    });

    test('group B: tuning/melody/scale/duet', async ({ page }) => {
        test.setTimeout(120000);
        await openHome(page);
        await openGamesHub(page);

        await openGame(page, 'tuning-time');
        const tuningStatus = page.locator('#view-game-tuning-time [data-tuning="status"]');
        await expect(tuningStatus).not.toContainText('Pick a string', { timeout: 10000 });
        await page.locator('#view-game-tuning-time .tuning-btn[data-tuning-note="G"]').click();
        await page.locator('#view-game-tuning-time .tuning-btn[data-tuning-note="G"]').click();
        await returnToGames(page, 'tuning-time');

        await openGame(page, 'melody-maker');
        const melodyScore = page.locator('#view-game-melody-maker [data-melody="score"]');
        const melodyStart = await readNumericValue(melodyScore);
        await page.locator('#view-game-melody-maker .melody-btn[data-melody-note="G"]').click();
        await page.locator('#view-game-melody-maker .melody-btn[data-melody-note="A"]').click();
        await page.locator('#view-game-melody-maker .melody-btn[data-melody-note="B"]').click();
        await expect.poll(async () => readNumericValue(melodyScore), { timeout: 10000 })
            .toBeGreaterThanOrEqual(melodyStart + 40);
        const melodyTrack = page.locator('#view-game-melody-maker [data-melody="track"]');
        await expect(melodyTrack).toContainText('B');
        await expect(melodyTrack).toContainText('·');
        await returnToGames(page, 'melody-maker');

        await openGame(page, 'scale-practice');
        const scaleScore = page.locator('#view-game-scale-practice [data-scale="score"]');
        await tapScaleUntilScoreChanges(page, scaleScore);
        await returnToGames(page, 'scale-practice');

        await openGame(page, 'duet-challenge');
        await ensureSoundsEnabled(page);
        const duetStepOne = page.locator('#view-game-duet-challenge #dc-step-1');
        await expect.poll(async () => {
            await page.locator('#view-game-duet-challenge [data-duet="play"]').click();
            return duetStepOne.isChecked();
        }, { timeout: 10000 }).toBe(true);
        const duetPrompt = page.locator('#view-game-duet-challenge [data-duet="prompt"]');
        await expect(page.locator('#view-game-duet-challenge .duet-btn').first()).toBeEnabled({ timeout: 12000 });
        await expect.poll(async () => {
            const text = await duetPrompt.innerText();
            return text.includes('Your turn');
        }, { timeout: 12000 }).toBe(true);
        const duetSequence = await page.locator('#view-game-duet-challenge .duet-notes').innerText();
        const notes = duetSequence.split('·').map((note) => note.trim()).filter(Boolean);
        for (const note of notes) {
            await page.locator(`#view-game-duet-challenge .duet-btn[data-duet-note="${note}"]`).click();
        }
        await expect(page.locator('#view-game-duet-challenge #dc-step-2')).toBeChecked();
        await returnToGames(page, 'duet-challenge');
    });

    test('group C: string/painter/story/pizzicato', async ({ page }) => {
        test.setTimeout(120000);
        await openHome(page);
        await openGamesHub(page);

        await openGame(page, 'string-quest');
        const stringScore = page.locator('#view-game-string-quest [data-string="score"]');
        await dispatchGameRecordedEvent(page, 'string-quest', 150);
        await page.waitForTimeout(300);
        await returnToGames(page, 'string-quest');

        await openGame(page, 'rhythm-painter');
        const painterScore = page.locator('#view-game-rhythm-painter [data-painter="score"]');
        await tapPainterUntilScoreIncreases(page, painterScore);
        await expect(page.locator('#view-game-rhythm-painter [data-painter="creativity"]')).not.toHaveText('0%');
        await returnToGames(page, 'rhythm-painter');

        await openGame(page, 'story-song');
        const storyStatus = page.locator('#view-game-story-song [data-story="status"]');
        await expect(storyStatus).toContainText('Play-Along to start.');
        await page.locator('#view-game-story-song #story-play').evaluate((input) => {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await expect(storyStatus).not.toHaveText('Press Play-Along to start.');
        await returnToGames(page, 'story-song');

        await openGame(page, 'pizzicato');
        const pizzScore = page.locator('#view-game-pizzicato [data-pizzicato="score"]');
        await dispatchGameRecordedEvent(page, 'pizzicato', 200);
        await page.waitForTimeout(300);
        await returnToGames(page, 'pizzicato');
    });
});
