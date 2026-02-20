import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

const seedEvents = async (page, events) => {
    await page.evaluate(async ({ seededEvents }) => {
        const key = 'panda-violin:events:v1';
        const fallbackKey = `panda-violin:kv:${key}`;

        localStorage.setItem(key, JSON.stringify(seededEvents));
        localStorage.setItem(fallbackKey, JSON.stringify(seededEvents));

        await new Promise((resolve, reject) => {
            const request = indexedDB.open('panda-violin-db', 2);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('kv')) {
                    db.createObjectStore('kv');
                }
                if (!db.objectStoreNames.contains('blobs')) {
                    db.createObjectStore('blobs');
                }
            };

            request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('kv', 'readwrite');
                tx.objectStore('kv').put(seededEvents, key);
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    const err = tx.error;
                    db.close();
                    reject(err || new Error('IndexedDB write failed'));
                };
                tx.onabort = () => {
                    const err = tx.error;
                    db.close();
                    reject(err || new Error('IndexedDB write aborted'));
                };
            };
        });
    }, { seededEvents: events });
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
        await page.locator('[data-parent-goal-title-input]').evaluate((input, value) => {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }, title);
        await page.locator('[data-parent-goal-minutes-input]').evaluate((input, value) => {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }, String(minutes));

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

test('progress cards remain functional across navigation', async ({ page }) => {
    await openHome(page);

    const day = Math.floor(Date.now() / 86400000);
    const now = Date.now();
    await seedEvents(page, [
        { type: 'practice', id: 'pq-step-1', minutes: 8, day, timestamp: now - 2000 },
        { type: 'game', id: 'pitch-quest', score: 88, accuracy: 88, stars: 4, day, timestamp: now - 1000 },
    ]);

    await page.goto('/#view-game-pitch-quest');
    await expect(page.locator('#view-game-pitch-quest')).toBeVisible();
    await page.locator('#view-game-pitch-quest [data-pitch="check"]').click();

    await page.goto('/#view-progress');
    await expect(page.locator('#view-progress')).toBeVisible();

    await expect.poll(async () => {
        return page.locator('[data-recent-game][hidden]').count();
    }).toBeLessThan(3);

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();

    await page.goto('/#view-progress');
    await expect(page.locator('#view-progress')).toBeVisible();
    await expect(page.locator('[data-progress="xp-info"]')).not.toHaveText('0 / 0 XP');
});

test('backup export remains wired after revisiting backup view', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-backup');
    await expect(page.locator('#view-backup')).toBeVisible();
    await waitForBoundFlag(page, '[data-export-json]', 'data-backup-bound');

    await triggerBackupExportAndWaitForStatus(page);

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();

    await page.goto('/#view-backup');
    await expect(page.locator('#view-backup')).toBeVisible();
    await waitForBoundFlag(page, '[data-export-json]', 'data-backup-bound');

    await triggerBackupExportAndWaitForStatus(page);
});

test('parent goals remain editable after revisiting parent view', async ({ page }) => {
    await openHome(page);

    await page.evaluate(() => {
        sessionStorage.setItem('panda-violin:parent-unlocked', 'true');
    });

    await page.goto('/#view-parent');
    await expect(page.locator('#view-parent')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-parent-goal-save]')).toBeEnabled();
    await waitForBoundFlag(page, '[data-parent-goal-save]', 'data-parent-goal-bound');

    await saveParentGoal(page, { title: 'Recital Etude', minutes: 120 });

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();

    await page.goto('/#view-parent');
    await expect(page.locator('#view-parent')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-parent-goal-save]')).toBeEnabled();
    await waitForBoundFlag(page, '[data-parent-goal-save]', 'data-parent-goal-bound');

    await saveParentGoal(page, { title: 'Spring Concert', minutes: 140 });
});

test('parent PIN gate remains functional after re-render', async ({ page }) => {
    await openHome(page);

    await page.evaluate(() => {
        sessionStorage.removeItem('panda-violin:parent-unlocked');
    });

    await page.goto('/#view-parent');
    const dialog = page.locator('[data-pin-dialog]');
    await expect.poll(async () => page.locator('[data-pin-dialog]').count(), { timeout: 10000 }).toBe(1);
    await expect(dialog).toBeVisible();

    await page.locator('#parent-pin-input').fill('1001');
    await page.locator('[data-pin-dialog] button[value="confirm"]').click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();

    await page.evaluate(() => {
        sessionStorage.removeItem('panda-violin:parent-unlocked');
    });

    await page.goto('/#view-parent');
    await expect.poll(async () => page.locator('[data-pin-dialog]').count(), { timeout: 10000 }).toBe(1);
    await expect(dialog).toBeVisible();

    await page.locator('[data-pin-dialog] button[value="cancel"]').click();
    await page.waitForURL('**/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();
});

test('parent advanced controls stay interactive after revisiting parent view', async ({ page }) => {
    await openHome(page);

    await page.evaluate(() => {
        sessionStorage.setItem('panda-violin:parent-unlocked', 'true');
    });

    await page.goto('/#view-parent');
    await expect(page.locator('#view-parent')).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => page.locator('[data-input-status]').innerText()).toContain('Input:');
    await waitForBoundFlag(page, '#setting-offline-mode', 'data-offline-mode-bound');

    await runOfflineCheckAndWaitForAssets(page);

    await page.locator('#setting-offline-mode').evaluate((input) => {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('[data-offline-mode-status]')).toContainText('Offline mode is on');

    await page.locator('[data-ml-demo]').evaluate((input) => {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('[data-ml-simulate]')).toBeEnabled();

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();

    await page.goto('/#view-parent');
    await expect(page.locator('#view-parent')).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => page.locator('[data-input-status]').innerText()).toContain('Input:');
    await waitForBoundFlag(page, '#setting-offline-mode', 'data-offline-mode-bound');

    await runOfflineCheckAndWaitForAssets(page);

    await page.locator('#setting-offline-mode').evaluate((input) => {
        input.checked = false;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('[data-offline-mode-status]')).toContainText('Offline mode is off');

    await page.locator('[data-ml-demo]').evaluate((input) => {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('[data-ml-simulate]')).toBeEnabled();
});
