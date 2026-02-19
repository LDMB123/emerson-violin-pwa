import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

const seedSongEvents = async (page, events) => {
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

        document.dispatchEvent(new CustomEvent('panda:song-recorded', {
            detail: {
                id: 'gavotte',
                accuracy: 80,
                timestamp: Date.now(),
            },
        }));
    }, { seededEvents: events });
};

test('coach tools stay functional after leaving and returning to coach', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-coach');
    await expect(page.locator('#view-coach')).toBeVisible();

    await page.locator('[data-coach-action="next"]').click();
    await page.waitForTimeout(700);
    await expect(page.locator('.coach-bubble-text')).not.toHaveText('');

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.goto('/#view-coach');
    await expect(page.locator('#view-coach')).toBeVisible();

    await page.locator('[data-coach-step-target="warmup"]').click();
    await page.locator('.practice-focus .btn-start').click();
    await expect(page.locator('.focus-status')).toContainText('Time left');
    await page.locator('.practice-focus .btn-stop').click();
    await expect(page.locator('.focus-status')).toContainText('Session paused');

    await page.locator('[data-coach-step-target="play"]').click();
    await page.locator('[data-lesson-runner-start]').click();
    await expect(page.locator('[data-lesson-runner-status]')).toContainText('Step in progress');
});

test('songs filtering and continue-last-song stay functional after navigation', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();

    await page.locator('label:has(input[name="song-filter"][value="challenge"]) .filter-chip').click();
    await expect(page.locator('.song-card:not(.is-hidden)')).toHaveCount(1);

    await page.locator('label:has(input[name="song-filter"][value="easy"]) .filter-chip').click();
    await expect(page.locator('.song-card:not(.is-hidden)')).toHaveCount(5);

    await page.locator('a[href="#view-song-mary"]').click();
    await page.waitForURL('**/#view-song-mary');
    await page.locator('.song-controls .btn-start').click();
    await page.waitForTimeout(250);
    await page.locator('.song-controls .btn-stop').click();
    await page.locator('.song-controls a[href="#view-songs"]').click();
    await page.waitForURL('**/#view-songs');

    await page.locator('label:has(input[name="song-filter"][value="easy"]) .filter-chip').click();
    await expect(page.locator('.song-card:not(.is-hidden)')).toHaveCount(5);

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

    await page.locator('label:has(input[name="game-sort"][value="favorites"]) .filter-chip').click();
    await expect(targetCard).not.toHaveClass(/is-hidden/);

    await page.goto('/#view-home');
    await expect(page.locator('#view-home')).toBeVisible();

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();
    await page.locator('label:has(input[name="game-sort"][value="favorites"]) .filter-chip').click();
    await expect(page.locator('#view-games .game-card[data-game-id="tuning-time"]')).not.toHaveClass(/is-hidden/);
    await expect(page.locator('#view-games .game-card[data-game-id="tuning-time"] [data-game-favorite]'))
        .toHaveAttribute('aria-pressed', 'true');
});

test('challenge songs unlock after 3 clean practice songs', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-songs');
    await expect(page.locator('#view-songs')).toBeVisible();
    await page.locator('label:has(input[name="song-filter"][value="challenge"]) .filter-chip').click();

    const challengeCard = page.locator('#view-songs .song-card[data-song="perpetual_motion"]');
    const challengeHint = challengeCard.locator('.song-lock-hint');

    await expect(challengeCard).toHaveClass(/is-locked/);
    await expect(challengeHint).toContainText('0/3');

    await challengeCard.evaluate((card) => {
        card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await expect(page).toHaveURL(/#view-songs$/);

    const now = Date.now();
    const day = Math.floor(now / 86400000);
    await seedSongEvents(page, [
        { type: 'song', id: 'ode_to_joy', accuracy: 82, day, timestamp: now - 3000 },
        { type: 'song', id: 'minuet_1', accuracy: 88, day, timestamp: now - 2000 },
        { type: 'song', id: 'gavotte', accuracy: 91, day, timestamp: now - 1000 },
    ]);

    await expect(challengeCard).not.toHaveClass(/is-locked/);
    await expect(challengeHint).toContainText('Unlocked');

    await page.locator('label:has(input[name="song-filter"][value="practice"]) .filter-chip').click();
    const gavotteCard = page.locator('#view-songs .song-card[data-song="gavotte"]');
    await expect(gavotteCard.locator('.song-progress-meta')).toContainText('Best 91%');
    await expect(gavotteCard).toHaveClass(/is-mastered/);
});

test('coach goals auto-sync from game and song activity outside coach view', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-games');
    await expect(page.locator('#view-games')).toBeVisible();

    await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('panda:game-recorded', {
            detail: { id: 'scale-practice', score: 92, accuracy: 92 },
        }));
        document.dispatchEvent(new CustomEvent('panda:song-recorded', {
            detail: { id: 'twinkle', accuracy: 84, timestamp: Date.now() },
        }));
    });

    await page.goto('/#view-coach');
    await expect(page.locator('#view-coach')).toBeVisible();
    await expect(page.locator('#goal-scale')).toBeChecked();
    await expect(page.locator('#goal-song')).toBeChecked();
    await expect(page.locator('[data-coach-mission-status]')).toContainText('2/5');
});

test('coach stepper auto-advances from realtime and lesson events', async ({ page }) => {
    await openHome(page);

    await page.goto('/#view-coach');
    await expect(page.locator('#view-coach')).toBeVisible();

    const tuneTab = page.locator('[data-coach-step-target="tune"]');
    const warmupTab = page.locator('[data-coach-step-target="warmup"]');
    const playTab = page.locator('[data-coach-step-target="play"]');

    await expect(tuneTab).toHaveClass(/is-active/);
    await expect(tuneTab).toHaveAttribute('data-bound', 'true');

    await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('panda:rt-session-started', {
            detail: { active: true },
        }));
    });
    await expect(warmupTab).toHaveClass(/is-active/);

    await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('panda:lesson-step', {
            detail: {
                state: 'start',
                index: 0,
                total: 5,
                step: { label: 'Technique focus' },
            },
        }));
    });
    await expect(playTab).toHaveClass(/is-active/);

    await tuneTab.click();
    await expect(tuneTab).toHaveClass(/is-active/);

    await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('panda:game-recorded', {
            detail: { id: 'pitch-quest', score: 90 },
        }));
    });
    await expect(playTab).toHaveClass(/is-active/);
});
