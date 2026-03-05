import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { gotoAndExpectView } from './helpers/view-navigation.js';

const playToneUntilCardActive = async (page, tone = 'A') => {
    const toneButton = page.locator(`[data-tone="${tone}"]`);
    const toneCard = page.locator(`.audio-card[data-string="${tone}"]`);

    await expect.poll(async () => {
        await toneButton.click();
        return (await toneCard.getAttribute('class')) || '';
    }, { timeout: 10000 }).toMatch(/is-playing/);
};

const toggleMetronomeUntilLabel = async (page, label) => {
    const toggle = page.locator('[data-metronome="toggle"]');
    await expect.poll(async () => {
        await toggle.click();
        return (await toggle.innerText()).trim();
    }, { timeout: 10000 }).toContain(label);
};

const gotoView = async (page, viewId) => gotoAndExpectView(page, `#${viewId}`);
const reopenViaGames = async (page, viewId) => {
    await gotoView(page, 'view-games');
    await gotoView(page, viewId);
};

test('trainer metronome remains functional after navigation', async ({ page }) => {
    await openHome(page);
    await gotoView(page, 'view-trainer');

    await toggleMetronomeUntilLabel(page, 'Stop');

    await reopenViaGames(page, 'view-trainer');

    await toggleMetronomeUntilLabel(page, 'Start');

    await toggleMetronomeUntilLabel(page, 'Stop');
});

test('bowing and posture tools remain functional after navigation', async ({ page }) => {
    await openHome(page);
    await gotoView(page, 'view-bowing');
    await expect(page.locator('#view-bowing .game-drill-intro')).toContainText('Goal:', { timeout: 10000 });

    await reopenViaGames(page, 'view-bowing');
    await expect(page.locator('#view-bowing .game-drill-intro')).toContainText('Goal:', { timeout: 10000 });

    await gotoView(page, 'view-posture');

    const sampleFile = {
        name: 'posture.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex'),
    };

    await page.locator('#posture-capture').setInputFiles(sampleFile);
    await expect(page.locator('[data-posture-preview]')).toBeVisible();

    await page.locator('[data-posture-clear]').click();
    await expect(page.locator('[data-posture-preview]')).toHaveAttribute('hidden', '');

    await reopenViaGames(page, 'view-posture');

    await page.locator('#posture-capture').setInputFiles(sampleFile);
    await expect(page.locator('[data-posture-preview]')).toBeVisible();
});

test('tuner reference tone controls remain functional after navigation', async ({ page }) => {
    await openHome(page);
    await gotoView(page, 'view-settings');
    const soundToggle = page.locator('#setting-sounds');
    if (!(await soundToggle.isChecked())) {
        await soundToggle.check();
    }

    await gotoView(page, 'view-tuner');

    await playToneUntilCardActive(page, 'A');

    await reopenViaGames(page, 'view-tuner');

    await playToneUntilCardActive(page, 'A');
});
