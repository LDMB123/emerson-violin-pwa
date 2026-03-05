import { describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
    readStringArrayFromStorage: vi.fn(() => ['bow-hero']),
    writeStringArrayToStorage: vi.fn(),
}));

vi.mock('../../src/utils/storage-utils.js', () => storageMocks);

import {
    buildGameSortMaps,
    deriveDynamicSortSets,
    readFavoriteIds,
    shouldShowGameCard,
    writeFavoriteIds,
} from '../../src/app/game-sort-model.js';

describe('app/game-sort-model', () => {
    const card = (id, tags) => {
        const el = document.createElement('article');
        el.dataset.gameId = id;
        el.dataset.sortTags = tags;
        return el;
    };

    it('builds game sort maps and fallback ids from card tags', () => {
        const cards = [
            card('bow-hero', 'quick,favorites'),
            card('ear-trainer', 'new,quick'),
            card('', 'quick'),
        ];

        const maps = buildGameSortMaps(cards);

        expect(maps.cardById.size).toBe(2);
        expect(maps.sortTagsById.get('bow-hero')).toEqual(['quick', 'favorites']);
        expect(maps.fallbackQuickIds).toEqual(['bow-hero', 'ear-trainer']);
        expect(maps.fallbackNewIds).toEqual(['ear-trainer']);
    });

    it('filters cards by selected sort mode using dynamic sets when available', () => {
        const sortTagsById = new Map([
            ['a', ['quick']],
            ['b', ['new']],
            ['c', ['favorites']],
        ]);

        expect(shouldShowGameCard({
            selected: 'favorites',
            id: 'c',
            sortTagsById,
            favoriteIds: new Set(['c']),
            newIds: new Set(),
            quickIds: new Set(),
        })).toBe(true);

        expect(shouldShowGameCard({
            selected: 'new',
            id: 'b',
            sortTagsById,
            favoriteIds: new Set(),
            newIds: new Set(['b']),
            quickIds: new Set(),
        })).toBe(true);

        expect(shouldShowGameCard({
            selected: 'quick',
            id: 'a',
            sortTagsById,
            favoriteIds: new Set(),
            newIds: new Set(),
            quickIds: new Set(['a']),
        })).toBe(true);

        expect(shouldShowGameCard({
            selected: 'all',
            id: 'c',
            sortTagsById,
            favoriteIds: new Set(),
            newIds: new Set(),
            quickIds: new Set(),
        })).toBe(true);
    });

    it('derives quick/new sets from recommendations, events, and fallbacks', () => {
        const cardById = new Map([
            ['bow-hero', {}],
            ['ear-trainer', {}],
            ['rhythm-dash', {}],
            ['tuner-time', {}],
        ]);

        const result = deriveDynamicSortSets({
            events: [
                { type: 'game', id: 'view-game-rhythm-dash', timestamp: 100 },
                { type: 'game', id: '#view-game-ear-trainer', timestamp: 300 },
                { type: 'song', id: 'view-song-twinkle', timestamp: 400 },
                { type: 'game', id: 'ear-trainer', timestamp: 200 },
            ],
            recs: {
                recommendedGameId: '#view-game-bow-hero',
            },
            cardById,
            fallbackQuickIds: ['tuner-time'],
            fallbackNewIds: ['rhythm-dash'],
        });

        expect(result.quickIds.has('bow-hero')).toBe(true);
        expect(result.quickIds.has('ear-trainer')).toBe(true);
        expect(result.quickIds.has('tuner-time')).toBe(true);
        expect(result.newIds.has('tuner-time')).toBe(true);
        expect(result.newIds.has('bow-hero')).toBe(true);
        expect(result.newIds.has('ear-trainer')).toBe(false);
        expect(result.newIds.has('rhythm-dash')).toBe(false);
    });

    it('reads and writes favorite ids with the expected storage key', () => {
        const favorites = readFavoriteIds();
        writeFavoriteIds(['ear-trainer', 'bow-hero']);

        expect(favorites).toEqual(['bow-hero']);
        expect(storageMocks.readStringArrayFromStorage).toHaveBeenCalledWith('panda-violin:game-favorites:v1');
        expect(storageMocks.writeStringArrayToStorage).toHaveBeenCalledWith(
            'panda-violin:game-favorites:v1',
            ['ear-trainer', 'bow-hero'],
        );
    });
});
