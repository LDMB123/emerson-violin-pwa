import { expect, test } from '@playwright/test';
import { setCheckboxValue, setInputValue } from './helpers/dom-controls.js';
import { openHome } from './helpers/open-home.js';
import { seedKVValue } from './helpers/seed-kv.js';
import { gotoAndExpectView, setParentUnlocked } from './helpers/view-navigation.js';

const seedEvents = async (page, events) => {
    await seedKVValue(page, 'panda-violin:events:v1', events);
};

const saveParentGoal = async (page, { title, minutes }) => {
    await page.waitForURL('**/#view-parent');
    await waitForBoundFlag(page, '[data-parent-goal-title-input]', 'data-parent-goal-bound');
    await waitForBoundFlag(page, '[data-parent-goal-minutes-input]', 'data-parent-goal-bound');
    await waitForBoundFlag(page, '[data-parent-goal-save]', 'data-parent-goal-bound');

    const status = page.locator('[data-parent-goal-status]');
    const goalTitle = page.locator('[data-parent-goal-title]');
    await expect(status).not.toContainText('Loading goal', { timeout: 10000 });

    const applyGoalValues = async () => {
        await setInputValue(page.locator('[data-parent-goal-title-input]'), title);
        await setInputValue(page.locator('[data-parent-goal-minutes-input]'), String(minutes));

        await expect(page.locator('[data-parent-goal-title-input]')).toHaveValue(title);
        await expect(page.locator('[data-parent-goal-minutes-input]')).toHaveValue(String(minutes));
    };

    const triggerSave = async () => {
        const sentinel = `Saving ${Date.now()}`;
        await status.evaluate((el, value) => {
            el.textContent = value;
        }, sentinel);

        await expect(page.locator('[data-parent-goal-save]')).toBeEnabled({ timeout: 10000 });
        await page.locator('[data-parent-goal-save]').click();

        await expect.poll(async () => status.innerText(), { timeout: 10000 }).not.toBe(sentinel);
        await expect(status).toContainText('Goal saved');
    };

    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await applyGoalValues();
            await triggerSave();
            await expect.poll(async () => goalTitle.innerText(), { timeout: 10000 }).toContain(title);
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error(`Unable to save parent goal "${title}".`);
};

const triggerBackupExportAndWaitForStatus = async (page) => {
    const status = page.locator('[data-export-status]');
    const sentinel = 'Export pending test trigger';
    await status.evaluate((el, value) => {
        el.textContent = value;
    }, sentinel);

    await page.locator('[data-export-json]').click();

    await expect.poll(async () => {
        return page.locator('[data-export-status]').innerText();
    }, { timeout: 10000 }).not.toBe(sentinel);

    await expect(status).not.toContainText('Unable to export backup. Try again.');
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
    await expect.poll(async () => {
        return page.locator(selector).getAttribute(attribute).catch(() => '');
    }, { timeout: 10000 }).toBe('true');
};
const goHome = async (page) => gotoAndExpectView(page, '#view-home');
const goParent = async (page) => gotoAndExpectView(page, '#view-parent');
const openBackupViewReady = async (page) => {
    await gotoAndExpectView(page, '#view-backup');
    await waitForBoundFlag(page, '[data-export-json]', 'data-backup-bound');
};
const openParentGoalViewReady = async (page) => {
    await goParent(page);
    await expect(page.locator('[data-parent-goal-save]')).toBeEnabled();
    await waitForBoundFlag(page, '[data-parent-goal-save]', 'data-parent-goal-bound');
};
const prepareParentAdvancedControls = async (page) => {
    await goParent(page);
    await expect.poll(async () => page.locator('[data-input-status]').innerText()).toContain('Input:');
    await waitForBoundFlag(page, '#setting-offline-mode', 'data-offline-mode-bound');
};
const setOfflineMode = async (page, enabled) => {
    const expectedStatus = enabled ? 'Offline mode is on' : 'Offline mode is off';
    await expect.poll(async () => {
        const toggle = page.locator('#setting-offline-mode');
        if (await toggle.isDisabled().catch(() => true)) return '';
        await setCheckboxValue(toggle, Boolean(enabled)).catch(() => {});
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
    await page.locator(`[data-pin-dialog] button[value="${action}"]`).evaluate((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        if (button.form?.requestSubmit) {
            button.form.requestSubmit(button);
            return;
        }
        button.click();
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

    await gotoAndExpectView(page, '#view-game-pitch-quest');
    const listenButton = page.locator('#view-game-pitch-quest [data-pitch="listen"]').first();
    await expect(listenButton).toBeVisible();
    await listenButton.click({ force: true });

    await gotoAndExpectView(page, '#view-progress');

    await expect.poll(async () => {
        return page.locator('[data-recent-game][hidden]').count();
    }).toBeLessThan(3);

    await goHome(page);

    await gotoAndExpectView(page, '#view-progress');
    await expect(page.locator('[data-progress="xp-info"]')).not.toHaveText('0 / 0 XP');
});

test('backup export remains wired after revisiting backup view', async ({ page }) => {
    await openHome(page);

    await openBackupViewReady(page);

    await triggerBackupExportAndWaitForStatus(page);

    await goHome(page);

    await openBackupViewReady(page);

    await triggerBackupExportAndWaitForStatus(page);
});

test('parent goals remain editable after revisiting parent view', async ({ page }) => {
    await openHome(page);

    await setParentUnlocked(page, true);

    await openParentGoalViewReady(page);

    await saveParentGoal(page, { title: 'Recital Etude', minutes: 120 });

    await goHome(page);

    await openParentGoalViewReady(page);

    await saveParentGoal(page, { title: 'Spring Concert', minutes: 140 });
});

test('parent PIN gate remains functional after re-render', async ({ page }) => {
    await openHome(page);

    await setParentUnlocked(page, false);

    await goParent(page);
    const dialog = await expectPinDialogVisible(page);

    await page.locator('#parent-pin-input').fill('1001');
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

test('parent advanced controls stay interactive after revisiting parent view', async ({ page }) => {
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
