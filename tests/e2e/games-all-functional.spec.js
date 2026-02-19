import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { navigateToView } from './helpers/navigate-view.js';

const openGamesHub = async (page) => {
    await page.locator('.bottom-nav a[href="#view-games"]').click();
    await navigateToView(page, 'view-games', { timeout: 10000 });
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

const openGame = async (page, gameId) => {
    const targetViewId = `view-game-${gameId}`;
    const targetView = page.locator(`#${targetViewId}`);
    const gameLink = page.locator(`a[href="#${targetViewId}"]`).first();

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await dismissGameCompleteIfOpen(page);
        await navigateToView(page, targetViewId, { timeout: 7000 }).catch(() => {});
        await page.waitForURL(`**/#${targetViewId}`, { timeout: 7000 }).catch(() => {});
        if (await targetView.isVisible().catch(() => false)) {
            await dismissGameCompleteIfOpen(page);
            if (await targetView.isVisible().catch(() => false)) {
                return;
            }
        }
        if (await gameLink.isVisible().catch(() => false)) {
            await gameLink.click({ timeout: 3000 }).catch(() => {});
            if (await targetView.isVisible().catch(() => false)) {
                await dismissGameCompleteIfOpen(page);
                if (await targetView.isVisible().catch(() => false)) {
                    return;
                }
            }
        }
        await navigateToView(page, 'view-games', { timeout: 7000 }).catch(() => {});
    }

    await navigateToView(page, targetViewId, { timeout: 10000 }).catch(() => {});
    await page.waitForURL(`**/#${targetViewId}`, { timeout: 10000 }).catch(() => {});
    await dismissGameCompleteIfOpen(page);
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
            await page.locator('#game-complete-back').click().catch(() => {});
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
        await page.locator('#view-game-rhythm-dash .rhythm-tap').click();
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

const tapScaleUntilScoreIncreases = async (page, scoreLocator) => {
    const startScore = await readNumericValue(scoreLocator);
    const tapButton = page.locator('#view-game-scale-practice [data-scale="tap"]');

    for (let attempt = 0; attempt < 8; attempt += 1) {
        await dismissGameCompleteIfOpen(page);
        await tapButton.click();
        await page.waitForTimeout(300);
        if ((await readNumericValue(scoreLocator)) > startScore) {
            return;
        }
    }

    expect(await readNumericValue(scoreLocator)).toBeGreaterThan(startScore);
};

const hitActiveTargetUntilScoreIncreases = async (
    page,
    {
        scoreLocator,
        activeTargetSelector,
        activeTargetDataKey,
        buttonSelector,
    },
) => {
    const startScore = await readNumericValue(scoreLocator);

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const target = await page.evaluate(({ selector, dataKey }) => {
            const active = document.querySelector(selector);
            return active?.dataset?.[dataKey] || null;
        }, { selector: activeTargetSelector, dataKey: activeTargetDataKey });

        if (target) {
            await page.locator(buttonSelector(target)).click();
            await page.waitForTimeout(120);
            if ((await readNumericValue(scoreLocator)) > startScore) {
                return target;
            }
        } else {
            await page.waitForTimeout(120);
        }
    }

    expect(await readNumericValue(scoreLocator)).toBeGreaterThan(startScore);
    return null;
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
                lastFeature: {
                    note: targetNote,
                    cents: 0,
                    hasSignal: true,
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
        const pitchStart = await pitchScore.innerText();
        await emitPitchLockFeature(page, 'A');
        await page.locator('#view-game-pitch-quest [data-pitch="check"]').click();
        await expect(pitchScore).not.toHaveText(pitchStart);
        await returnToGames(page, 'pitch-quest');

        await openGame(page, 'rhythm-dash');
        const rhythmScore = page.locator('#view-game-rhythm-dash [data-rhythm="score"]');
        await tapRhythmUntilScoreIncreases(page, rhythmScore);
        await page.locator('#view-game-rhythm-dash label.btn-stop').click();
        await returnToGames(page, 'rhythm-dash');

        await openGame(page, 'note-memory');
        await page.waitForTimeout(200);
        let matched = false;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            const pairs = await findMemoryPairs(page);
            expect(pairs.length).toBeGreaterThan(0);
            const pair = pairs[attempt % pairs.length];
            await page.evaluate(([firstId, secondId]) => {
                const flip = (id) => {
                    const input = document.getElementById(id);
                    if (!(input instanceof HTMLInputElement) || input.disabled) return;
                    input.checked = true;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                };
                flip(firstId);
                flip(secondId);
            }, pair);
            const matchesText = await page.locator('#view-game-note-memory [data-memory="matches"]').innerText();
            if (matchesText !== '0/6') {
                matched = true;
                break;
            }
            await page.waitForTimeout(700);
        }
        expect(matched).toBe(true);
        await returnToGames(page, 'note-memory');

        await openGame(page, 'ear-trainer');
        const earQuestion = page.locator('#view-game-ear-trainer [data-ear="question"]');
        await expect(earQuestion).toContainText('Question 1 of 10');
        await ensureSoundsEnabled(page);
        await expect.poll(async () => {
            await page.locator('#view-game-ear-trainer [data-ear="play"]').click();
            return earQuestion.innerText();
        }, { timeout: 10000 }).not.toBe('Question 1 of 10');
        await returnToGames(page, 'ear-trainer');

        await openGame(page, 'bow-hero');
        const bowStars = page.locator('#view-game-bow-hero [data-bow="stars"]');
        await tapBowUntilStarsIncrease(page, bowStars);
        await returnToGames(page, 'bow-hero');
    });

    test('group B: tuning/melody/scale/duet', async ({ page }) => {
        test.setTimeout(90000);
        await openHome(page);
        await openGamesHub(page);

        await openGame(page, 'tuning-time');
        const tuningStatus = page.locator('#view-game-tuning-time [data-tuning="status"]');
        await expect(tuningStatus).not.toContainText('Pick a string', { timeout: 10000 });
        await page.locator('#view-game-tuning-time .tuning-btn[data-tuning-note="G"]').click();
        await expect(page.locator('#view-game-tuning-time #tt-step-1')).toBeChecked();
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
        await tapScaleUntilScoreIncreases(page, scaleScore);
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
        test.setTimeout(90000);
        await openHome(page);
        await openGamesHub(page);

        await openGame(page, 'string-quest');
        const stringScore = page.locator('#view-game-string-quest [data-string="score"]');
        const stringTarget = await hitActiveTargetUntilScoreIncreases(page, {
            scoreLocator: stringScore,
            activeTargetSelector: '#view-game-string-quest [data-string-target].is-target',
            activeTargetDataKey: 'stringTarget',
            buttonSelector: (note) => `#view-game-string-quest .string-btn[data-string-btn="${note}"]`,
        });
        expect(stringTarget).toBeTruthy();
        await returnToGames(page, 'string-quest');

        await openGame(page, 'rhythm-painter');
        const painterScore = page.locator('#view-game-rhythm-painter [data-painter="score"]');
        await tapPainterUntilScoreIncreases(page, painterScore);
        await expect(page.locator('#view-game-rhythm-painter [data-painter="creativity"]')).not.toHaveText('0%');
        await returnToGames(page, 'rhythm-painter');

        await openGame(page, 'story-song');
        const storyStatus = page.locator('#view-game-story-song [data-story="status"]');
        await expect(storyStatus).toContainText('Play-Along to start.');
        await page.locator('#view-game-story-song label[for="story-play"]').click();
        await expect(storyStatus).not.toContainText('Play-Along to start.');
        await returnToGames(page, 'story-song');

        await openGame(page, 'pizzicato');
        const pizzScore = page.locator('#view-game-pizzicato [data-pizzicato="score"]');
        const pizzTarget = await hitActiveTargetUntilScoreIncreases(page, {
            scoreLocator: pizzScore,
            activeTargetSelector: '#view-game-pizzicato [data-pizzicato-target].is-target',
            activeTargetDataKey: 'pizzicatoTarget',
            buttonSelector: (note) => `#view-game-pizzicato .pizzicato-btn[data-pizzicato-btn="${note}"]`,
        });
        expect(pizzTarget).toBeTruthy();
        await returnToGames(page, 'pizzicato');
    });
});
