import { expect, test } from '@playwright/test';

const openHome = async (page) => {
    await page.goto('/');
    await page.waitForSelector('#main-content .view', { timeout: 10000 });

    if (await page.locator('#view-onboarding').isVisible().catch(() => false)) {
        await page.locator('#onboarding-skip').click();
        await page.waitForURL('**/#view-home');
    }
};

test('trainer metronome remains functional after navigation', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-trainer');
    await expect(page.locator('#view-trainer')).toBeVisible();

    await page.locator('[data-metronome="toggle"]').click();
    await expect(page.locator('[data-metronome="toggle"]')).toContainText('Stop');

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-trainer');
    await expect(page.locator('#view-trainer')).toBeVisible();

    await page.locator('[data-metronome="toggle"]').click();
    await expect(page.locator('[data-metronome="toggle"]')).toContainText('Start');

    await page.locator('[data-metronome="toggle"]').click();
    await expect(page.locator('[data-metronome="toggle"]')).toContainText('Stop');
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

    const aCard = page.locator('.audio-card[data-string="A"]');
    await page.locator('[data-tone="A"]').click();
    await expect(aCard).toHaveClass(/is-playing/);

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-tuner');
    await expect(page.locator('#view-tuner')).toBeVisible();

    await page.locator('[data-tone="A"]').click();
    await expect(page.locator('.audio-card[data-string="A"]')).toHaveClass(/is-playing/);
});
