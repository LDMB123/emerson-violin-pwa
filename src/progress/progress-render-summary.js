import {
    renderCurriculumMap,
    renderSongHeatmap,
    renderGameMasteryMatrix,
    renderNextActions,
} from './progress-learning-renderers.js';
import { setBadge } from '../notifications/badging.js';
import { GAME_LABELS } from '../utils/recommendations-utils.js';
import { GAME_META } from '../games/game-config.js';
import { renderCoreProgressUi } from './progress-core-render.js';
import { renderProgressAchievements } from './progress-achievements.js';

export const renderProgressSummary = ({
    summary,
    elements,
    achievementEls,
    dailyGoalTarget,
    weeklyGoalTarget,
    learningContainers,
}) => {
    const {
        progress,
        tracker,
        streak,
        weekMinutes,
        dailyMinutes,
        skills,
        weakestSkill,
        recentGames,
        curriculumState,
        curriculumContent,
        songProgressState,
        gameMasteryState,
        recommendations,
        songCatalog,
    } = summary;

    renderCoreProgressUi({
        elements,
        progress,
        streak,
        weekMinutes,
        dailyMinutes,
        skills,
        weakestSkill,
        recentGames,
        dailyGoalTarget,
        weeklyGoalTarget,
    });

    renderProgressAchievements({
        tracker,
        achievementEls,
    });

    renderCurriculumMap({
        curriculumContent,
        curriculumState,
        recommendations,
        progressEl: learningContainers.progressCurriculumMapEl,
        parentEl: learningContainers.parentCurriculumMapEl,
    });

    renderSongHeatmap({
        songProgressState,
        songCatalog,
        progressEl: learningContainers.progressSongHeatmapEl,
        parentEl: learningContainers.parentSongHeatmapEl,
    });

    renderGameMasteryMatrix({
        gameMasteryState,
        gameMeta: GAME_META,
        gameLabels: GAME_LABELS,
        progressEl: learningContainers.progressGameMasteryEl,
        parentEl: learningContainers.parentGameMasteryEl,
    });

    renderNextActions({
        recommendations,
        progressEl: learningContainers.progressNextActionsEl,
        parentEl: learningContainers.parentNextActionsEl,
    });

    setBadge(Math.max(0, Math.min(99, Number(streak) || 0)));
};
