import { describe, expect, it, vi } from 'vitest';

const modelMocks = vi.hoisted(() => ({
    buildGameSortMaps: vi.fn(),
    deriveDynamicSortSets: vi.fn(),
    readFavoriteIds: vi.fn(),
    writeFavoriteIds: vi.fn(),
}));

const viewMocks = vi.hoisted(() => ({
    applyGameSort: vi.fn(),
    bindGameSortControls: vi.fn(),
    bindGameSortFavorites: vi.fn(),
}));

const loaderMocks = vi.hoisted(() => ({
    loadEvents: vi.fn(async () => [{ type: 'game', id: 'known-id', timestamp: 1 }]),
}));

const recommendationsMocks = vi.hoisted(() => ({
    getLearningRecommendations: vi.fn(async () => ({ recommendedGameId: 'known-id' })),
}));

vi.mock('../../src/app/game-sort-model.js', () => modelMocks);
vi.mock('../../src/app/game-sort-view.js', () => viewMocks);
vi.mock('../../src/persistence/loaders.js', () => loaderMocks);
vi.mock('../../src/ml/recommendations.js', () => recommendationsMocks);

import { bindGameSort } from '../../src/app/game-sort-controller.js';

describe('app/game-sort-controller', () => {
    const flush = async () => {
        await Promise.resolve();
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    };

    const setupDefaultMocks = () => {
        modelMocks.buildGameSortMaps.mockImplementation((cards) => {
            const cardById = new Map(cards.map((card) => [card.dataset.gameId, card]));
            return {
                cardById,
                sortTagsById: new Map(Array.from(cardById.keys()).map((id) => [id, ['quick']])),
                fallbackQuickIds: Array.from(cardById.keys()),
                fallbackNewIds: Array.from(cardById.keys()),
            };
        });
        modelMocks.deriveDynamicSortSets.mockReturnValue({
            quickIds: new Set(['known-id']),
            newIds: new Set(['known-id']),
        });
        modelMocks.readFavoriteIds.mockReturnValue(['known-id', 'missing-id']);
        modelMocks.writeFavoriteIds.mockImplementation(() => {});
        viewMocks.applyGameSort.mockImplementation(() => {});
        viewMocks.bindGameSortControls.mockImplementation(() => {});
        viewMocks.bindGameSortFavorites.mockImplementation(() => {});
    };

    it('returns early when game sort controls/cards are missing', () => {
        setupDefaultMocks();
        document.body.innerHTML = '<section id="empty"></section>';
        const container = document.getElementById('empty');

        bindGameSort(container);

        expect(viewMocks.bindGameSortFavorites).not.toHaveBeenCalled();
        expect(viewMocks.bindGameSortControls).not.toHaveBeenCalled();
        expect(viewMocks.applyGameSort).not.toHaveBeenCalled();
    });

    it('creates context, syncs favorites, and hydrates dynamic sets', async () => {
        setupDefaultMocks();
        document.body.innerHTML = `
            <section id="games">
                <input type="radio" name="game-sort" value="quick" checked />
                <article class="game-card" data-game-id="known-id" data-sort-tags="quick"></article>
                <p data-games-empty hidden></p>
            </section>
        `;
        const container = document.getElementById('games');

        bindGameSort(container);
        await flush();

        expect(modelMocks.buildGameSortMaps).toHaveBeenCalledTimes(1);
        expect(modelMocks.writeFavoriteIds).toHaveBeenCalledWith(['known-id']);
        expect(viewMocks.bindGameSortFavorites).toHaveBeenCalledTimes(1);
        expect(viewMocks.bindGameSortControls).toHaveBeenCalledTimes(1);
        expect(viewMocks.applyGameSort).toHaveBeenCalled();
    });
});
