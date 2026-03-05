import { GAME_LABELS } from '../utils/recommendations-utils.js';
import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadCurriculumState } from '../curriculum/state.js';
import { getCurriculumContent } from '../curriculum/content-loader.js';
import { loadSongProgressState } from '../songs/song-progression.js';
import { loadGameMasteryState } from '../games/game-mastery.js';
import { getSongCatalog } from '../songs/song-library.js';
import { formatRecentScore } from './progress-utils.js';

const buildRecentGames = (gameEvents = []) => gameEvents
    .slice(-3)
    .reverse()
    .map((event) => ({
        id: event.id,
        label: GAME_LABELS[event.id] || event.id || 'Game',
        scoreLabel: formatRecentScore(event),
    }));

const loadSupplementaryProgressData = async () => {
    const [
        curriculumState,
        curriculumContent,
        songProgressState,
        gameMasteryState,
        recommendations,
        songCatalog,
    ] = await Promise.all([
        loadCurriculumState().catch(() => ({ completedUnitIds: [], currentUnitId: null })),
        getCurriculumContent().catch(() => ({ units: [] })),
        loadSongProgressState().catch(() => ({ songs: {} })),
        loadGameMasteryState().catch(() => ({ games: {} })),
        getLearningRecommendations().catch(() => ({ nextActions: [], mission: null })),
        getSongCatalog().catch(() => ({ byId: {}, songs: [] })),
    ]);

    return {
        curriculumState,
        curriculumContent,
        songProgressState,
        gameMasteryState,
        recommendations,
        songCatalog,
    };
};

const composeProgressResult = (model = {}) => {
    const {
        gameEvents,
        supplemental,
        ...base
    } = model;
    return {
        ...base,
        recentGames: buildRecentGames(gameEvents),
        ...supplemental,
    };
};

export const composeProgressWithSupplemental = async (model) => {
    const supplemental = await loadSupplementaryProgressData();
    return composeProgressResult({
        ...model,
        supplemental,
    });
};
