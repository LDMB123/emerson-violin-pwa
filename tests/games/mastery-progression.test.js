import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = vi.hoisted(() => ({
    store: new Map(),
}));

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async (key) => memory.store.get(key) ?? null),
    setJSON: vi.fn(async (key, value) => {
        memory.store.set(key, value);
    }),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);

import {
    loadGameMasteryState,
    summarizeGameMastery,
    updateGameMastery,
} from '../../src/games/game-mastery.js';

describe('games/mastery-progression', () => {
    beforeEach(() => {
        memory.store.clear();
        storageMocks.getJSON.mockClear();
        storageMocks.setJSON.mockClear();
    });

    it('requires distinct-day validation for bronze/silver/gold', async () => {
        await updateGameMastery({ gameId: 'pitch-quest', score: 65, day: 100 });
        await updateGameMastery({ gameId: 'pitch-quest', score: 66, day: 101 });
        let result = await updateGameMastery({ gameId: 'pitch-quest', score: 70, day: 102 });
        expect(result.game.tier).toBe('bronze');

        await updateGameMastery({ gameId: 'pitch-quest', score: 82, day: 200 });
        await updateGameMastery({ gameId: 'pitch-quest', score: 83, day: 201 });
        result = await updateGameMastery({ gameId: 'pitch-quest', score: 85, day: 202 });
        expect(result.game.tier).toBe('silver');

        // Same-day attempts should not inflate day counters.
        result = await updateGameMastery({ gameId: 'pitch-quest', score: 99, day: 202 });
        expect(result.game.goldDays).toBe(1);

        await updateGameMastery({ gameId: 'pitch-quest', score: 93, day: 300 });
        await updateGameMastery({ gameId: 'pitch-quest', score: 94, day: 301 });
        result = await updateGameMastery({ gameId: 'pitch-quest', score: 95, day: 302 });
        expect(result.game.tier).toBe('gold');
    });

    it('summarizes mastery tiers across games', async () => {
        await updateGameMastery({ gameId: 'pitch-quest', score: 65, day: 1 });
        await updateGameMastery({ gameId: 'pitch-quest', score: 66, day: 2 });
        await updateGameMastery({ gameId: 'pitch-quest', score: 67, day: 3 });

        await updateGameMastery({ gameId: 'rhythm-dash', score: 40, day: 1 });

        const state = await loadGameMasteryState();
        const summary = summarizeGameMastery(state);
        expect(summary.bronze).toBe(1);
        expect(summary.foundation).toBe(1);
    });
});
