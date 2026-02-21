import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

const seedKVValue = async (page, key, value) => {
    await page.evaluate(async ({ targetKey, targetValue }) => {
        const fallbackKey = `panda-violin:kv:${targetKey}`;
        localStorage.setItem(targetKey, JSON.stringify(targetValue));
        localStorage.setItem(fallbackKey, JSON.stringify(targetValue));

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
                tx.objectStore('kv').put(targetValue, targetKey);
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
    }, { targetKey: key, targetValue: value });
};

const seedSongEvents = async (page, events) => {
    await seedKVValue(page, 'panda-violin:events:v1', events);
    await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('panda:song-recorded', {
            detail: {
                id: 'gavotte',
                accuracy: 80,
                timestamp: Date.now(),
            },
        }));
    });
};


test('songs filtering and continue-last-song stay functional after navigation', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();

    await page.locator('label:has(input[name="song-filter"][value="challenge"]) .filter-chip').click({ force: true });
    await expect(page.locator('.song-card').filter({ visible: true })).toHaveCount(1);

    await page.locator('label:has(input[name="song-filter"][value="easy"]) .filter-chip').click({ force: true });
    await expect(page.locator('.song-card').filter({ visible: true })).toHaveCount(5);

    await page.locator('a[href="#view-song-mary"]').click();
    await page.waitForURL('**/#view-song-mary');
    await page.locator('.song-controls .btn-start').click();
    await page.waitForTimeout(250);
    await page.locator('.song-controls .btn-stop').click();
    await page.locator('.song-controls a[href="#view-songs"]').click();
    await page.waitForURL('**/#view-songs');

    await page.locator('label:has(input[name="song-filter"][value="easy"]) .filter-chip').click({ force: true });
    await expect(page.locator('.song-card').filter({ visible: true })).toHaveCount(5);

    await expect.poll(async () => {
        return page.locator('[data-continue-last-song]').getAttribute('href');
    }, { timeout: 10000 }).toContain('#view-song-mary');
});

test('games hub surfaces the full implemented game catalog', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    const gameIds = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#view-games .game-card[data-game-id]'))
            .map((card) => card.getAttribute('data-game-id'))
            .filter(Boolean);
    });

    expect(gameIds.length).toBe(13);
    expect(new Set(gameIds).size).toBe(13);
    expect(gameIds).toEqual(expect.arrayContaining([
        'pitch-quest',
        'rhythm-dash',
        'note-memory',
        'ear-trainer',
        'bow-hero',
        'string-quest',
        'rhythm-painter',
        'story-song',
        'pizzicato',
        'tuning-time',
        'melody-maker',
        'scale-practice',
        'duet-challenge',
    ]));
});

test('games favorites filter uses persisted player favorites', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    const targetCard = page.locator('#view-games .game-card[data-game-id="tuning-time"]');
    const targetFavorite = targetCard.locator('[data-game-favorite]');

    await expect(targetFavorite).toBeVisible();
    await targetFavorite.evaluate((button) => {
        button.click();
    });
    await expect(targetFavorite).toHaveAttribute('aria-pressed', 'true');

    await page.locator('label:has(input[name="game-sort"][value="favorites"]) .filter-chip').click({ force: true });
    await expect(targetCard).not.toHaveClass(/is-hidden/);

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();
    await page.locator('label:has(input[name="game-sort"][value="favorites"]) .filter-chip').click({ force: true });
    await expect(page.locator('#view-games .game-card[data-game-id="tuning-time"]')).not.toHaveClass(/is-hidden/);
    await expect(page.locator('#view-games .game-card[data-game-id="tuning-time"] [data-game-favorite]'))
        .toHaveAttribute('aria-pressed', 'true');
});

test('challenge songs stay locked until curriculum prerequisites are met', async ({ page }) => {
    await openHome(page);
    page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER_ERR:', err));

    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();
    await page.locator('label:has(input[name="song-filter"][value="challenge"]) .filter-chip').click({ force: true });

    const challengeCard = page.locator('#view-songs .song-card[data-song="perpetual_motion"]');
    const challengeHint = challengeCard.locator('.song-lock-hint');

    await expect(challengeCard).toHaveClass(/song-soft-lock/);
    await expect(challengeHint).toContainText('Locked: complete curriculum prerequisites');

    await challengeCard.evaluate((card) => {
        card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page).toHaveURL(/#view-songs$/);

    const now = Date.now();
    const day = Math.floor(now / 86400000);
    await seedSongEvents(page, [
        { type: 'song', id: 'ode_to_joy', accuracy: 82, day, timestamp: now - 3000 },
        { type: 'song', id: 'minuet_1', accuracy: 88, day, timestamp: now - 2000 },
    ]);

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();
    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();
    await page.locator('label:has(input[name="song-filter"][value="challenge"]) .filter-chip').click({ force: true });
    await expect(page.locator('#view-songs .song-card[data-song="perpetual_motion"]')).toHaveClass(/song-soft-lock/);


    await seedKVValue(page, 'panda-violin:curriculum-state-v1', {
        version: 1,
        currentUnitId: 'u-int-04',
        activeMissionId: null,
        currentMission: null,
        completedUnitIds: ['u-int-03', 'u-int-04'],
        unitProgress: {},
        lastUpdatedAt: now,
    });

    await seedKVValue(page, 'panda-violin:song-progress-v2', {
        version: 2,
        songs: {
            ode_to_joy: {
                attempts: 1,
                bestAccuracy: 82,
                bestTiming: 82,
                bestIntonation: 80,
                bestStars: 3,
                sectionProgress: {},
                checkpoint: null,
                updatedAt: now - 3000,
            },
            minuet_1: {
                attempts: 1,
                bestAccuracy: 88,
                bestTiming: 88,
                bestIntonation: 87,
                bestStars: 4,
                sectionProgress: {},
                checkpoint: null,
                updatedAt: now - 2000,
            },
        },
    });

    await seedKVValue(page, 'panda-violin:song-progress-v2', {
        version: 2,
        songs: {
            ode_to_joy: {
                attempts: 1,
                bestAccuracy: 82,
                bestTiming: 82,
                bestIntonation: 80,
                bestStars: 3,
                updatedAt: now - 3000,
            },
            minuet_1: {
                attempts: 1,
                bestAccuracy: 88,
                bestTiming: 88,
                bestIntonation: 87,
                bestStars: 4,
                updatedAt: now - 2000,
            },
            gavotte: {
                attempts: 1,
                bestAccuracy: 91,
                bestTiming: 91,
                bestIntonation: 90,
                bestStars: 4,
                updatedAt: now - 1000,
            },
        },
    });

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();
    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();
    await page.locator('label:has(input[name="song-filter"][value="challenge"]) .filter-chip').click({ force: true });
    await expect(page.locator('#view-songs .song-card[data-song="perpetual_motion"]')).not.toHaveClass(/song-soft-lock/);
    await expect(challengeHint).toContainText('Unlocked');

    await page.locator('label:has(input[name="song-filter"][value="practice"]) .filter-chip').click({ force: true });
    const gavotteCard = page.locator('#view-songs .song-card[data-song="gavotte"]');
    await expect(gavotteCard.locator('.song-progress-meta')).toContainText('Best 91%');
    await expect(gavotteCard).toHaveClass(/is-mastered/);
});

