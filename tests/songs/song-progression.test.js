import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    kv: {},
    curriculum: { completedUnitIds: [] },
    now: 1_700_000_000_000,
}));

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async (key) => state.kv[key] ?? null),
    setJSON: vi.fn(async (key, value) => {
        state.kv[key] = JSON.parse(JSON.stringify(value));
    }),
}));

const curriculumMocks = vi.hoisted(() => ({
    loadCurriculumState: vi.fn(async () => state.curriculum),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);
vi.mock('../../src/curriculum/state.js', () => curriculumMocks);

import {
    collectDueSongReviews,
    loadSongProgressState,
    updateSongProgress,
} from '../../src/songs/song-progression.js';

describe('song progression durability', () => {
    beforeEach(() => {
        state.kv = {};
        state.curriculum = { completedUnitIds: [] };
        storageMocks.getJSON.mockClear();
        storageMocks.setJSON.mockClear();
        state.now = 1_700_000_000_000;
        vi.spyOn(Date, 'now').mockImplementation(() => state.now);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('tracks distinct-day mastery and promotes tier after repeated days', async () => {
        await updateSongProgress('twinkle', {
            accuracy: 90,
            timingAccuracy: 89,
            intonationAccuracy: 90,
            day: 100,
        });
        await updateSongProgress('twinkle', {
            accuracy: 91,
            timingAccuracy: 91,
            intonationAccuracy: 92,
            day: 101,
        });
        await updateSongProgress('twinkle', {
            accuracy: 92,
            timingAccuracy: 93,
            intonationAccuracy: 92,
            day: 102,
        });

        const stateAfter = await loadSongProgressState();
        const entry = stateAfter.songs.twinkle;

        expect(entry).toBeTruthy();
        expect(entry.silverDays).toBe(3);
        expect(entry.tier).toBe('silver');
        expect(Object.keys(entry.days)).toEqual(['100', '101', '102']);
    });

    it('returns due song reviews based on scheduled next review date', async () => {
        await updateSongProgress('mary', {
            accuracy: 70,
            timingAccuracy: 70,
            intonationAccuracy: 70,
            day: 200,
        });

        state.now += 2 * 24 * 60 * 60 * 1000;
        const due = await collectDueSongReviews();

        expect(Array.isArray(due)).toBe(true);
        expect(due[0]).toMatchObject({
            id: 'mary',
            tier: 'foundation',
        });
        expect(due[0].overdueMs).toBeGreaterThan(0);
    });
});
