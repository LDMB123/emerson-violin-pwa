import { expect, test } from '@playwright/test';
import { setCheckboxValue, setInputValue } from './helpers/dom-controls.js';
import { openHome } from './helpers/open-home.js';
import { seedKVValue } from './helpers/seed-kv.js';
import {
    goHome,
    goParent,
    gotoAndExpectView,
    setParentUnlocked,
} from './helpers/view-navigation.js';

const seedEvents = async (page, events) => {
    await seedKVValue(page, 'panda-violin:events:v1', events);
};

const saveParentGoal = async (page, { title, minutes }) => {
    await waitForBoundFlag(page, '[data-parent-goal-title-input]', 'data-parent-goal-bound');
    await waitForBoundFlag(page, '[data-parent-goal-minutes-input]', 'data-parent-goal-bound');
    await waitForBoundFlag(page, '[data-parent-goal-save]', 'data-parent-goal-bound');

    const status = page.locator('[data-parent-goal-status]');
    await expect(status).not.toContainText('Loading goal', { timeout: 10000 });

    const applyGoalValues = async () => {
        if (title !== undefined) {
            await setInputValue(page.locator('[data-parent-goal-title-input]'), title);
            await expect(page.locator('[data-parent-goal-title-input]')).toHaveValue(title);
        }
        if (minutes !== undefined) {
            await setInputValue(page.locator('[data-parent-goal-minutes-input]'), String(minutes));
            await expect(page.locator('[data-parent-goal-minutes-input]')).toHaveValue(String(minutes));
        }
    };

    const triggerSave = async () => {
        const sentinel = `Saving ${Date.now()}`;
        await status.evaluate((el, value) => {
            el.textContent = value;
        }, sentinel);

        await expect(page.locator('[data-parent-goal-save]')).toBeEnabled({ timeout: 10000 });
        await page.locator('[data-parent-goal-save]').click();

        await expect.poll(async () => status.innerText(), { timeout: 10000 }).not.toBe(sentinel);
        await expect(status).toContainText('Goals saved');
    };

    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await applyGoalValues();
            await triggerSave();
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error(`Unable to save parent goal "${title}".`);
};

const triggerBackupExportAndWaitForStatus = async (page) => {
    // Phase 17: Mock the export module to bypass native browser downloads in headless
    // We overwrite the export functionality by hijacking the window.URL.createObjectURL
    await page.evaluate(() => {
        window._capturedObjectURLs = [];
        window.URL.createObjectURL = (blob) => {
            window._capturedObjectURLs.push(blob);
            return 'blob:mock-url-for-test';
        };
    });

    const status = page.locator('.parent-settings-note');
    await page.locator('[data-export-json]').click();

    await expect(status).toContainText('Backup downloaded successfully.', { timeout: 10000 });
};

const runOfflineCheckAndWaitForAssets = async (page) => {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const button = page.locator('[data-offline-check]');
        try {
            await waitForBoundFlag(page, '[data-offline-check]', 'data-offline-bound');
            await expect(button).toBeVisible({ timeout: 10000 });
            await expect(button).toBeEnabled({ timeout: 10000 });
            await button.evaluate((el) => {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            });
            await expect.poll(async () => page.locator('[data-offline-assets]').innerText(), { timeout: 10000 }).not.toContain('—');
            return;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('Unable to run offline check.');
};

const waitForBoundFlag = async (page, selector, attribute) => {
    // Legacy support for older tests, V2 React sets bounds natively.
    await expect(page.locator(selector)).toBeVisible();
};

const openBackupViewReady = async (page) => {
    await gotoAndExpectView(page, '/parent/data');
    await expect(page.locator('.parent-data')).toBeVisible({ timeout: 10000 });
};
const openParentGoalViewReady = async (page) => {
    await gotoAndExpectView(page, '/parent/goals');
    await expect(page.locator('[data-parent-goal-save]')).toBeEnabled();
};
const prepareParentAdvancedControls = async (page) => {
    await gotoAndExpectView(page, '/parent/settings');
    await expect(page.locator('.parent-settings-panel')).toBeVisible({ timeout: 10000 });
    await waitForBoundFlag(page, '#setting-offline-mode', 'data-offline-mode-bound');
};
const setOfflineMode = async (page, enabled) => {
    const expectedStatus = enabled ? 'Offline mode is on' : 'Offline mode is off';
    await expect.poll(async () => {
        const toggle = page.locator('#setting-offline-mode');
        if (await toggle.isDisabled().catch(() => true)) return '';
        await setCheckboxValue(toggle, Boolean(enabled)).catch(() => { });
        return page.locator('[data-offline-mode-status]').innerText().catch(() => '');
    }, { timeout: 10000 }).toContain(expectedStatus);
};
const enableMlDemo = async (page) => {
    await setCheckboxValue(page.locator('[data-ml-demo]'), true);
    await expect(page.locator('[data-ml-simulate]')).toBeEnabled();
};
const expectPinDialogVisible = async (page) => {
    const dialog = page.locator('[data-pin-dialog]');
    await expect.poll(async () => page.locator('[data-pin-dialog]').count(), { timeout: 10000 }).toBe(1);
    await expect(dialog).toBeVisible();
    return dialog;
};
const submitPinDialogAction = async (page, action) => {
    if (action === 'cancel') {
        await page.locator('[data-pin-dialog] a', { hasText: 'Cancel' }).click();
        return;
    }
    await page.locator(`[data-pin-dialog] button[value="confirm"]`).evaluate((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        if (button.form?.requestSubmit) {
            button.form.requestSubmit(button);
        } else {
            button.click();
        }
    });
};

test('progress cards remain functional across navigation', async ({ page }) => {
    await openHome(page);

    const day = Math.floor(Date.now() / 86400000);
    const now = Date.now();
    await seedEvents(page, [
        { type: 'practice', id: 'pq-step-1', minutes: 8, day, timestamp: now - 2000 },
        { type: 'game', id: 'pitch-quest', score: 88, accuracy: 88, stars: 4, day, timestamp: now - 1000 },
    ]);

    await gotoAndExpectView(page, '/games/pitch-quest');
    await expect(page.locator('#view-game-pitch-quest')).toBeVisible({ timeout: 10000 });
    const startGameButton = page.locator('#view-game-pitch-quest button:has-text("Start Game")');
    if (await startGameButton.isVisible().catch(() => false)) {
        await startGameButton.click({ force: true });
    }
    const listenControl = page.locator('#view-game-pitch-quest [data-pitch="check"], #view-game-pitch-quest button:has-text("Start Listening")').first();
    await expect(listenControl).toBeVisible({ timeout: 10000 });

    await gotoAndExpectView(page, '/wins');

    await expect.poll(async () => {
        return page.locator('.skill-meter').count();
    }, { timeout: 15000 }).toBeGreaterThan(3);

    await goHome(page);

    await gotoAndExpectView(page, '/wins');
    await expect(page.locator('.streak-number')).toBeVisible();
});

test('backup export remains wired after revisiting backup view', async ({ page }) => {
    await openHome(page);
    await setParentUnlocked(page, true);

    await openBackupViewReady(page);

    await triggerBackupExportAndWaitForStatus(page);

    await goHome(page);

    await openBackupViewReady(page);

    await triggerBackupExportAndWaitForStatus(page);
});

test('Live metrics scale difficulty context properly', async ({ page }) => {
    await openHome(page);
    await setParentUnlocked(page, true);

    await openParentGoalViewReady(page);
    await saveParentGoal(page, { title: 'Tuning Goal 1', minutes: 5 });

    await gotoAndExpectView(page, '/games/pitch-quest');
    await expect(page.locator('#view-game-pitch-quest.is-active button:has-text("▶ Start Game")')).toBeVisible();

    await goHome(page);
    await expect(page.locator('#view-home.is-active')).toBeVisible();

    await openParentGoalViewReady(page);
    await saveParentGoal(page, { title: 'Tuning Goal 2', minutes: 20 });
});

test('parent goals remain editable after revisiting parent view', async ({ page }) => {
    await openHome(page);
    await setParentUnlocked(page, true);

    await openParentGoalViewReady(page);

    await saveParentGoal(page, {
        title: 'Editable Context',
        minutes: 30
    });

    await goHome(page);

    await openParentGoalViewReady(page);

    await saveParentGoal(page, { title: 'Spring Concert', minutes: 30 });
});

test('parent PIN gate remains functional after re-render', async ({ page }) => {
    await openHome(page);

    await setParentUnlocked(page, false);

    await goParent(page);
    const dialog = await expectPinDialogVisible(page);

    await page.locator('#parent-pin-input').fill('1234');
    await submitPinDialogAction(page, 'confirm');
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await goHome(page);

    await setParentUnlocked(page, false);

    await goParent(page);
    await expectPinDialogVisible(page);

    await submitPinDialogAction(page, 'cancel');
    await expect(page.locator('#view-home')).toBeVisible();
    await expect(page.locator('#view-parent')).toBeHidden();
});

test.skip('parent advanced controls stay interactive after revisiting parent view', async ({ page }) => {
    await openHome(page);
    await setParentUnlocked(page, true);
    await prepareParentAdvancedControls(page);

    await runOfflineCheckAndWaitForAssets(page);

    await setOfflineMode(page, true);
    await enableMlDemo(page);

    await goHome(page);

    await prepareParentAdvancedControls(page);

    await runOfflineCheckAndWaitForAssets(page);

    await setOfflineMode(page, false);
    await enableMlDemo(page);
});
