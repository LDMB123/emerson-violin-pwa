import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

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

test('trainer metronome remains functional after navigation', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-trainer');
    await expect(page.locator('#view-trainer')).toBeVisible();

    await toggleMetronomeUntilLabel(page, 'Stop');

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-trainer');
    await expect(page.locator('#view-trainer')).toBeVisible();

    await toggleMetronomeUntilLabel(page, 'Start');

    await toggleMetronomeUntilLabel(page, 'Stop');
});

test('bowing and posture tools remain functional after navigation', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-bowing');
    await expect(page.locator('#view-bowing')).toBeVisible();
    await expect(page.locator('#view-bowing .game-drill-intro')).toContainText('Goal:', { timeout: 10000 });

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-bowing');
    await expect(page.locator('#view-bowing .game-drill-intro')).toContainText('Goal:', { timeout: 10000 });

    await page.goto('/#view-posture');
    await expect(page.locator('#view-posture')).toBeVisible();

    const sampleFile = {
        name: 'posture.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex'),
    };

    await page.locator('#posture-capture').setInputFiles(sampleFile);
    await expect(page.locator('[data-posture-preview]')).toBeVisible();

    await page.locator('[data-posture-clear]').click();
    await expect(page.locator('[data-posture-preview]')).toHaveAttribute('hidden', '');

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-posture');
    await expect(page.locator('#view-posture')).toBeVisible();

    await page.locator('#posture-capture').setInputFiles(sampleFile);
    await expect(page.locator('[data-posture-preview]')).toBeVisible();
});

test('tuner reference tone controls remain functional after navigation', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-settings');
    await expect(page.locator('#view-settings')).toBeVisible();
    const soundToggle = page.locator('#setting-sounds');
    if (!(await soundToggle.isChecked())) {
        await soundToggle.check();
    }

    await page.goto('/#view-tuner');
    await expect(page.locator('#view-tuner')).toBeVisible();

    await playToneUntilCardActive(page, 'A');

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-tuner');
    await expect(page.locator('#view-tuner')).toBeVisible();

    await playToneUntilCardActive(page, 'A');
});
