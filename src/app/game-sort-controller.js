import {
    buildGameSortMaps,
    deriveDynamicSortSets,
    readFavoriteIds,
    writeFavoriteIds,
} from './game-sort-model.js';
import { applyGameSort, bindGameSortControls, bindGameSortFavorites } from './game-sort-view.js';

const createGameSortContext = (container) => {
    const sortControls = Array.from(container.querySelectorAll('input[name="game-sort"]'));
    const cards = Array.from(container.querySelectorAll('.game-card[data-sort-tags]'));
    if (!sortControls.length || !cards.length) return null;
    const emptyState = container.querySelector('[data-games-empty]');
    const {
        cardById,
        sortTagsById,
        fallbackQuickIds,
        fallbackNewIds,
    } = buildGameSortMaps(cards);
    if (!cardById.size) return null;
    return {
        sortControls,
        cards,
        emptyState,
        cardById,
        sortTagsById,
        fallbackQuickIds,
        fallbackNewIds,
        quickIds: new Set(fallbackQuickIds),
        newIds: new Set(fallbackNewIds),
        favoriteIds: new Set(readFavoriteIds().filter((id) => cardById.has(id))),
    };
};

const syncGameSortFavorites = (context) => {
    const nextIds = Array.from(context.favoriteIds).filter((id) => context.cardById.has(id));
    context.favoriteIds = new Set(nextIds);
    writeFavoriteIds(nextIds);
};

const hydrateGameSortDynamicSets = async (context) => {
    const [eventsResult, recsResult] = await Promise.allSettled([
        import('../persistence/loaders.js').then((module) => module.loadEvents()),
        import('../ml/recommendations.js').then((module) => module.getLearningRecommendations()),
    ]);

    const events = (eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value))
        ? eventsResult.value
        : [];
    const recs = recsResult.status === 'fulfilled' ? recsResult.value : null;
    const dynamicSets = deriveDynamicSortSets({
        events,
        recs,
        cardById: context.cardById,
        fallbackQuickIds: context.fallbackQuickIds,
        fallbackNewIds: context.fallbackNewIds,
    });
    context.quickIds = dynamicSets.quickIds;
    context.newIds = dynamicSets.newIds;
    applyGameSort(context);
};

export const bindGameSort = (container) => {
    const context = createGameSortContext(container);
    if (!context) return;
    syncGameSortFavorites(context);
    bindGameSortFavorites(context, syncGameSortFavorites);
    bindGameSortControls(context);
    applyGameSort(context);
    hydrateGameSortDynamicSets(context).catch(() => {});
};
