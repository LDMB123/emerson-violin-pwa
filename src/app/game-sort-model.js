import { readStringArrayFromStorage, writeStringArrayToStorage } from '../utils/storage-utils.js';

const GAME_FAVORITES_KEY = 'panda-violin:game-favorites:v1';
const GAME_QUICK_TARGET = 6;

const toGameId = (value) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('#view-game-')) return trimmed.slice('#view-game-'.length);
    if (trimmed.startsWith('view-game-')) return trimmed.slice('view-game-'.length);
    return trimmed;
};

/** Reads the persisted set of favorite game ids for the games shelf filters. */
export const readFavoriteIds = () => readStringArrayFromStorage(GAME_FAVORITES_KEY);

/** Persists the current favorite game ids for later filter restoration. */
export const writeFavoriteIds = (ids) => writeStringArrayToStorage(GAME_FAVORITES_KEY, ids);

const tagsForCard = (card) => (
    (card.dataset.sortTags || '')
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
);

/** Builds lookup tables and fallback tag sets from rendered game cards. */
export const buildGameSortMaps = (cards) => {
    const cardById = new Map(
        cards
            .map((card) => [card.dataset.gameId, card])
            .filter(([id]) => Boolean(id)),
    );
    const sortTagsById = new Map(
        Array.from(cardById.entries()).map(([id, card]) => [id, tagsForCard(card)]),
    );
    const fallbackQuickIds = Array.from(sortTagsById.entries())
        .filter(([, tags]) => tags.includes('quick'))
        .map(([id]) => id);
    const fallbackNewIds = Array.from(sortTagsById.entries())
        .filter(([, tags]) => tags.includes('new'))
        .map(([id]) => id);
    return {
        cardById,
        sortTagsById,
        fallbackQuickIds,
        fallbackNewIds,
    };
};

/** Returns whether a game card belongs in the active sort/filter bucket. */
export const shouldShowGameCard = ({ selected, id, sortTagsById, favoriteIds, newIds, quickIds }) => {
    const tags = sortTagsById.get(id) || [];
    if (selected === 'favorites') {
        if (favoriteIds.size > 0) return favoriteIds.has(id);
        return tags.includes('favorites');
    }
    if (selected === 'new') {
        if (newIds.size > 0) return newIds.has(id);
        return tags.includes('new');
    }
    if (selected === 'quick') {
        if (quickIds.size > 0) return quickIds.has(id);
        return tags.includes('quick');
    }
    return true;
};

/** Derives quick-pick and new-game sets from activity history and recommendations. */
export const deriveDynamicSortSets = ({ events, recs, cardById, fallbackQuickIds, fallbackNewIds }) => {
    const playedRecent = [];
    events
        .filter((event) => event?.type === 'game' && typeof event?.id === 'string')
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .forEach((event) => {
            const id = toGameId(event.id);
            if (!id || playedRecent.includes(id)) return;
            playedRecent.push(id);
        });
    const playedSet = new Set(playedRecent);

    const recommendedId = toGameId(
        recs?.recommendedGameId
        || recs?.recommendedGame
        || recs?.lessonSteps?.find((step) => step?.cta)?.cta,
    );

    const quickOrdered = [];
    const pushQuick = (id) => {
        if (!id || !cardById.has(id) || quickOrdered.includes(id)) return;
        quickOrdered.push(id);
    };
    pushQuick(recommendedId);
    playedRecent.forEach(pushQuick);
    fallbackQuickIds.forEach(pushQuick);

    const quickIds = quickOrdered.length
        ? new Set(quickOrdered.slice(0, Math.max(GAME_QUICK_TARGET, fallbackQuickIds.length)))
        : new Set(fallbackQuickIds);
    const unplayedIds = Array.from(cardById.keys()).filter((id) => !playedSet.has(id));
    const newIds = new Set(unplayedIds.length ? unplayedIds : fallbackNewIds);
    return { quickIds, newIds };
};
