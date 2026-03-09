import { useState, useEffect, useMemo } from 'react';
import { deriveDynamicSortSets, readFavoriteIds, writeFavoriteIds, buildGameSortMaps } from '../app/game-sort-model.js';
import { loadGameMasteryState } from '../games/game-mastery.js';
import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadEvents } from '../persistence/loaders.js';

const INITIAL_GAMES = [
    { id: 'dynamic-dojo', title: 'Dynamic Dojo', skill: 'Dynamics', tags: ['quick', 'new'], badge: '⭐' },
    { id: 'pitch-quest', title: 'Pitch Quest', skill: 'Pitch', tags: ['quick', 'favorites'], badge: '⭐', curated: true },
    { id: 'rhythm-dash', title: 'Rhythm Dash', skill: 'Rhythm', tags: ['quick', 'favorites'], badge: '⭐', curated: true },
    { id: 'note-memory', title: 'Note Memory', skill: 'Reading', tags: ['quick', 'new'], badge: '⭐', curated: true },
    { id: 'ear-trainer', title: 'Note Detective', skill: 'Pitch', tags: ['favorites', 'new'] },
    { id: 'tuning-time', title: 'Panda Tuner', skill: 'Pitch', tags: ['quick', 'new'] },
    { id: 'scale-practice', title: 'Scale Practice', skill: 'Pitch', tags: ['quick', 'new'] },
    { id: 'bow-hero', title: 'Bow Hero', skill: 'Bowing', tags: ['quick', 'favorites'] },
    { id: 'string-quest', title: 'String Quest', skill: 'Bowing', tags: ['quick', 'new'] },
    { id: 'rhythm-painter', title: 'Rhythm Painter', skill: 'Rhythm', tags: ['new'] },
    { id: 'story-song', title: 'Story Song Lab', skill: 'Reading', tags: ['new'] },
    { id: 'pizzicato', title: 'Pizzicato Pop', skill: 'Rhythm', tags: ['favorites', 'new'] },
    { id: 'melody-maker', title: 'Melody Maker', skill: 'Reading', tags: ['favorites', 'new'] },
    { id: 'duet-challenge', title: 'Duet Challenge', skill: 'Rhythm', tags: ['favorites', 'new'] },
    { id: 'stir-soup', title: 'Stir the Soup', skill: 'Bowing', tags: ['quick', 'new'] },
    { id: 'wipers', title: 'Windshield Wipers', skill: 'Bowing', tags: ['quick', 'new'] },
    { id: 'echo', title: 'Echo Engine', skill: 'Rhythm', tags: ['new'] }
];

const SKILL_FILTERS = ['Pitch', 'Rhythm', 'Bowing', 'Reading'];

export function useGameSort() {
    // Treat INITIAL_GAMES as if they were the parsed DOM cards to bridge legacy logic cleanly
    const { cardById, sortTagsById, fallbackQuickIds, fallbackNewIds } = useMemo(() => {
        const dummyCards = INITIAL_GAMES.map(g => ({ dataset: { gameId: g.id, sortTags: g.tags.join(',') } }));
        return buildGameSortMaps(dummyCards);
    }, []);

    const [selectedSort, setSelectedSort] = useState('all');
    const [quickIds, setQuickIds] = useState(new Set(fallbackQuickIds));
    const [newIds, setNewIds] = useState(new Set(fallbackNewIds));
    const [gameMastery, setGameMastery] = useState({});
    const [favoriteIds, setFavoriteIds] = useState(() => {
        const ids = readFavoriteIds().filter(id => cardById.has(id));
        writeFavoriteIds(ids);
        return new Set(ids);
    });

    useEffect(() => {
        let mounted = true;

        const hydrate = async () => {
            try {
                const [eventsResult, recsResult] = await Promise.allSettled([
                    loadEvents(),
                    getLearningRecommendations()
                ]);

                if (!mounted) return;

                const events = (eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value)) ? eventsResult.value : [];
                const recs = recsResult.status === 'fulfilled' ? recsResult.value : null;

                const dynamicSets = deriveDynamicSortSets({
                    events,
                    recs,
                    cardById,
                    fallbackQuickIds,
                    fallbackNewIds
                });

                setQuickIds(dynamicSets.quickIds);
                setNewIds(dynamicSets.newIds);

                // Load mastery state for personal bests
                try {
                    const state = await loadGameMasteryState();
                    if (mounted && state?.games) setGameMastery(state.games);
                } catch { }
            } catch (err) {
                console.error('Failed to hydrate game sort sets', err);
            }
        };

        hydrate();

        return () => {
            mounted = false;
        };
    }, [cardById, fallbackQuickIds, fallbackNewIds]);

    const filteredGames = useMemo(() => {
        return INITIAL_GAMES.filter(game => {
            const id = game.id;
            const tags = sortTagsById.get(id) || [];

            if (selectedSort === 'all') return true;
            if (selectedSort === 'favorites') {
                return (favoriteIds.size > 0) ? favoriteIds.has(id) : tags.includes('favorites');
            }
            if (selectedSort === 'new') {
                return (newIds.size > 0) ? newIds.has(id) : tags.includes('new');
            }
            if (selectedSort === 'quick') {
                return (quickIds.size > 0) ? quickIds.has(id) : tags.includes('quick');
            }
            // Skill-based filter
            if (SKILL_FILTERS.includes(selectedSort)) {
                return game.skill === selectedSort || (game.skill === 'Dynamics' && selectedSort === 'Bowing');
            }
            return true;
        });
    }, [selectedSort, favoriteIds, newIds, quickIds, sortTagsById]);

    const toggleFavorite = (gameId) => {
        setFavoriteIds(prev => {
            const next = new Set(prev);
            if (next.has(gameId)) next.delete(gameId);
            else next.add(gameId);
            writeFavoriteIds([...next]);
            return next;
        });
    };

    return {
        selectedSort,
        setSelectedSort,
        filteredGames,
        favoriteIds,
        toggleFavorite,
        gameMastery,
        SKILL_FILTERS
    };
}
