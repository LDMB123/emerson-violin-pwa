import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

const openGamesHub = async (page) => {
    await page.locator('.bottom-nav a[href="#view-games"]').click();
    await page.waitForURL('**/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();
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
    await page.evaluate((id) => {
        window.location.hash = `#view-game-${id}`;
    }, gameId);
    await page.waitForURL(`**/#view-game-${gameId}`);
    await expect(page.locator(`#view-game-${gameId}`)).toBeVisible();
    await dismissGameCompleteIfOpen(page);
};

const returnToGames = async (page, gameId) => {
    const completeModal = page.locator('#game-complete-modal');
    if (await completeModal.isVisible().catch(() => false)) {
        await page.locator('#game-complete-back').click();
    } else {
        await page.locator(`#view-game-${gameId} .back-btn`).click();
    }
    await page.waitForURL('**/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();
};

const findMemoryPair = async (page) => {
    return page.evaluate(() => {
        const buckets = {};
        document.querySelectorAll('#view-game-note-memory .memory-card').forEach((card) => {
            const id = card.querySelector('input')?.id;
            const note = card.querySelector('.memory-back')?.textContent?.trim();
            if (!id || !note) return;
            if (!buckets[note]) buckets[note] = [];
            buckets[note].push(id);
        });

        const ids = Object.values(buckets).find((entries) => entries.length >= 2);
        return ids ? ids.slice(0, 2) : null;
    });
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
        await page.locator('#view-game-pitch-quest [data-pitch="check"]').click();
        await expect(pitchScore).not.toHaveText(pitchStart);
        await returnToGames(page, 'pitch-quest');

        await openGame(page, 'rhythm-dash');
        const rhythmScore = page.locator('#view-game-rhythm-dash [data-rhythm="score"]');
        const rhythmStart = await rhythmScore.innerText();
        await page.locator('#view-game-rhythm-dash label.btn-start').click();
        await page.locator('#view-game-rhythm-dash .rhythm-tap').click();
        await page.waitForTimeout(750);
        await page.locator('#view-game-rhythm-dash .rhythm-tap').click();
        await expect(rhythmScore).not.toHaveText(rhythmStart);
        await page.locator('#view-game-rhythm-dash label.btn-stop').click();
        await returnToGames(page, 'rhythm-dash');

        await openGame(page, 'note-memory');
        const pair = await findMemoryPair(page);
        expect(pair).toBeTruthy();
        await page.locator(`#view-game-note-memory label[for="${pair[0]}"]`).click();
        await page.locator(`#view-game-note-memory label[for="${pair[1]}"]`).click();
        await expect(page.locator('#view-game-note-memory [data-memory="matches"]')).not.toHaveText('0/6');
        await returnToGames(page, 'note-memory');

        await openGame(page, 'ear-trainer');
        const earQuestion = page.locator('#view-game-ear-trainer [data-ear="question"]');
        await expect(earQuestion).toContainText('Question 1 of 10');
        await page.locator('#view-game-ear-trainer [data-ear="play"]').click();
        await expect(earQuestion).not.toHaveText('Question 1 of 10');
        await returnToGames(page, 'ear-trainer');

        await openGame(page, 'bow-hero');
        const bowStars = page.locator('#view-game-bow-hero [data-bow="stars"]');
        const bowStart = await bowStars.innerText();
        await page.locator('#view-game-bow-hero .bow-stroke').click();
        await expect(bowStars).not.toHaveText(bowStart);
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
        const melodyStart = await melodyScore.innerText();
        await page.locator('#view-game-melody-maker .melody-btn[data-melody-note="G"]').click();
        await page.locator('#view-game-melody-maker .melody-btn[data-melody-note="A"]').click();
        await page.locator('#view-game-melody-maker .melody-btn[data-melody-note="B"]').click();
        await expect(melodyScore).not.toHaveText(melodyStart);
        await expect(page.locator('#view-game-melody-maker [data-melody="track"]')).toContainText('G');
        await returnToGames(page, 'melody-maker');

        await openGame(page, 'scale-practice');
        const scaleScore = page.locator('#view-game-scale-practice [data-scale="score"]');
        const scaleStart = await scaleScore.innerText();
        await page.locator('#view-game-scale-practice [data-scale="tap"]').click();
        await page.waitForTimeout(750);
        await page.locator('#view-game-scale-practice [data-scale="tap"]').click();
        await expect(scaleScore).not.toHaveText(scaleStart);
        await returnToGames(page, 'scale-practice');

        await openGame(page, 'duet-challenge');
        await page.locator('#view-game-duet-challenge [data-duet="play"]').click();
        const duetPrompt = page.locator('#view-game-duet-challenge [data-duet="prompt"]');
        await expect(duetPrompt).toContainText('Your turn', { timeout: 10000 });
        await expect(page.locator('#view-game-duet-challenge #dc-step-1')).toBeChecked();
        await expect(page.locator('#view-game-duet-challenge .duet-btn').first()).toBeEnabled();
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
        const stringStart = await stringScore.innerText();
        let stringTarget = null;
        await expect.poll(async () => {
            stringTarget = await page.evaluate(() => {
                const target = document.querySelector('#view-game-string-quest [data-string-target].is-target');
                return target?.dataset?.stringTarget || null;
            });
            return stringTarget;
        }, { timeout: 10000 }).not.toBeNull();
        expect(stringTarget).toBeTruthy();
        await page.locator(`#view-game-string-quest .string-btn[data-string-btn="${stringTarget}"]`).click();
        await expect(stringScore).not.toHaveText(stringStart);
        await returnToGames(page, 'string-quest');

        await openGame(page, 'rhythm-painter');
        const painterScore = page.locator('#view-game-rhythm-painter [data-painter="score"]');
        const painterStart = await painterScore.innerText();
        await page.locator('#view-game-rhythm-painter .paint-dot.dot-blue').click();
        await expect(painterScore).not.toHaveText(painterStart);
        await expect(page.locator('#view-game-rhythm-painter [data-painter="creativity"]')).not.toHaveText('0%');
        await returnToGames(page, 'rhythm-painter');

        await openGame(page, 'story-song');
        const storyStatus = page.locator('#view-game-story-song [data-story="status"]');
        await expect(storyStatus).toContainText('Press Play-Along to start.');
        await page.locator('#view-game-story-song label[for="story-play"]').click();
        await expect(storyStatus).not.toHaveText('Press Play-Along to start.');
        await returnToGames(page, 'story-song');

        await openGame(page, 'pizzicato');
        const pizzScore = page.locator('#view-game-pizzicato [data-pizzicato="score"]');
        const pizzStart = await pizzScore.innerText();
        const pizzTarget = await page.evaluate(() => {
            const target = document.querySelector('#view-game-pizzicato [data-pizzicato-target].is-target');
            return target?.dataset?.pizzicatoTarget || null;
        });
        expect(pizzTarget).toBeTruthy();
        await page.locator(`#view-game-pizzicato .pizzicato-btn[data-pizzicato-btn="${pizzTarget}"]`).click();
        await expect(pizzScore).not.toHaveText(pizzStart);
        await returnToGames(page, 'pizzicato');
    });
});
