import { whenReady } from '../utils/dom-ready.js';
import { removeJSON } from '../persistence/storage.js';
import { loadEvents, saveEvents } from '../persistence/loaders.js';
import { minutesForInput } from './progress-utils.js';
import { createProgressInputController } from './progress-input-controller.js';
import { todayDay } from '../utils/math.js';
import { EVENTS_KEY as EVENT_KEY, UI_STATE_KEY as PERSIST_KEY } from '../persistence/storage-keys.js';
import { PRACTICE_RECORDED, GAME_RECORDED, GOAL_TARGET_CHANGE } from '../utils/event-names.js';
import { buildProgress, collectEventIds } from './progress-model.js';
import { renderProgressSummary } from './progress-render-summary.js';
import { createProgressRenderScheduler } from './progress-render-scheduler.js';

let xpFillEl = null;
let xpInfoEl = null;
let levelEl = null;
let streakEl = null;
let homeStreakEl = null;
let weekMinutesEl = null;
let levelLabelEl = null;
let levelFillEl = null;
let dailyGoalValueEl = null;
let dailyGoalFillEl = null;
let dailyGoalTrackEl = null;
let gamesLevelLabelEl = null;
let gamesLevelFillEl = null;
let gamesLevelTrackEl = null;
let xpTrackEl = null;
let coachSpeechEl = null;
let resetButton = null;
let parentChartLineEl = null;
let parentChartPointsEl = null;
let parentSummaryEl = null;
let parentGoalFillEl = null;
let parentGoalValueEl = null;
let parentGoalTrackEl = null;
let parentSkillStars = [];
let coachStarsEl = null;
let recentGameEls = [];
let recentGamesEmptyEl = null;
let progressCurriculumMapEl = null;
let progressSongHeatmapEl = null;
let progressGameMasteryEl = null;
let progressNextActionsEl = null;
let parentCurriculumMapEl = null;
let parentSongHeatmapEl = null;
let parentGameMasteryEl = null;
let parentNextActionsEl = null;

let achievementEls = [];
let radarShapeEl = null;
let radarPointEls = [];

const resolveElements = () => {
    xpFillEl = document.querySelector('[data-progress="xp-fill"]');
    xpInfoEl = document.querySelector('[data-progress="xp-info"]');
    levelEl = document.querySelector('[data-progress="level"]');
    streakEl = document.querySelector('[data-progress="streak-days"]');
    homeStreakEl = document.querySelector('[data-progress="home-streak"]');
    weekMinutesEl = document.querySelector('[data-progress="week-minutes"]');
    levelLabelEl = document.querySelector('[data-progress="level-label"]');
    levelFillEl = document.querySelector('[data-progress="level-fill"]');
    dailyGoalValueEl = document.querySelector('[data-progress="daily-goal-value"]');
    dailyGoalFillEl = document.querySelector('[data-progress="daily-goal-fill"]');
    dailyGoalTrackEl = document.querySelector('[data-progress="daily-goal-track"]');
    gamesLevelLabelEl = document.querySelector('[data-progress="games-level-label"]');
    gamesLevelFillEl = document.querySelector('[data-progress="games-level-fill"]');
    gamesLevelTrackEl = document.querySelector('[data-progress="games-level-track"]');
    xpTrackEl = document.querySelector('[data-progress="xp-track"]');
    coachSpeechEl = document.querySelector('[data-progress="coach-speech"]');
    resetButton = document.querySelector('#reset-progress');
    parentChartLineEl = document.querySelector('[data-parent="week-line"]');
    parentChartPointsEl = document.querySelector('[data-parent="week-points"]');
    parentSummaryEl = document.querySelector('[data-parent="week-summary"]');
    parentGoalFillEl = document.querySelector('[data-parent="goal-fill"]');
    parentGoalValueEl = document.querySelector('[data-parent="goal-value"]');
    parentGoalTrackEl = document.querySelector('[data-parent="goal-track"]');
    parentSkillStars = Array.from(document.querySelectorAll('[data-parent-skill]'));
    coachStarsEl = document.querySelector('[data-coach="stars"]');
    recentGameEls = Array.from(document.querySelectorAll('[data-recent-game]'));
    recentGamesEmptyEl = document.querySelector('[data-recent-games-empty]');
    progressCurriculumMapEl = document.querySelector('[data-progress-curriculum-map]');
    progressSongHeatmapEl = document.querySelector('[data-progress-song-heatmap]');
    progressGameMasteryEl = document.querySelector('[data-progress-game-mastery]');
    progressNextActionsEl = document.querySelector('[data-progress-next-actions]');
    parentCurriculumMapEl = document.querySelector('[data-parent-curriculum-map]');
    parentSongHeatmapEl = document.querySelector('[data-parent-song-heatmap]');
    parentGameMasteryEl = document.querySelector('[data-parent-game-mastery]');
    parentNextActionsEl = document.querySelector('[data-parent-next-actions]');
    achievementEls = Array.from(document.querySelectorAll('[data-achievement]'));
    radarShapeEl = document.querySelector('[data-radar="shape"]');
    radarPointEls = Array.from(document.querySelectorAll('.radar-point[data-skill]'));
};

const getDailyGoalTarget = () => {
    const raw = document.documentElement.dataset.dailyGoalTarget
        || dailyGoalValueEl?.textContent
        || '15';
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 15 : parsed;
};
const getWeeklyGoalTarget = () => {
    const raw = document.documentElement.dataset.weeklyGoalTarget
        || parentGoalValueEl?.textContent?.split('/')?.[1]
        || '90';
    const parsed = Number.parseInt(String(raw).trim(), 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 90 : parsed;
};

const getRenderElements = () => ({
    xpFillEl,
    xpInfoEl,
    levelEl,
    streakEl,
    homeStreakEl,
    weekMinutesEl,
    levelLabelEl,
    levelFillEl,
    dailyGoalValueEl,
    dailyGoalFillEl,
    dailyGoalTrackEl,
    gamesLevelLabelEl,
    gamesLevelFillEl,
    gamesLevelTrackEl,
    xpTrackEl,
    coachSpeechEl,
    parentChartLineEl,
    parentChartPointsEl,
    parentSummaryEl,
    parentGoalFillEl,
    parentGoalValueEl,
    parentGoalTrackEl,
    parentSkillStars,
    coachStarsEl,
    recentGameEls,
    recentGamesEmptyEl,
    radarShapeEl,
    radarPointEls,
});

const getLearningContainers = () => ({
    progressCurriculumMapEl,
    progressSongHeatmapEl,
    progressGameMasteryEl,
    progressNextActionsEl,
    parentCurriculumMapEl,
    parentSongHeatmapEl,
    parentGameMasteryEl,
    parentNextActionsEl,
});

const applyUI = (summary) => {
    renderProgressSummary({
        summary,
        elements: getRenderElements(),
        achievementEls,
        dailyGoalTarget: getDailyGoalTarget(),
        weeklyGoalTarget: getWeeklyGoalTarget(),
        learningContainers: getLearningContainers(),
    });
};

const updateUI = createProgressRenderScheduler(applyUI);

const initProgress = async () => {
    resolveElements();
    const events = await loadEvents();
    await refreshProgressUiFromEvents(events);

    if (resetButton && resetButton.dataset.progressBound !== 'true') {
        resetButton.dataset.progressBound = 'true';
        resetButton.addEventListener('click', resetProgress);
    }
};

const refreshProgressUiFromEvents = async (events) => {
    const summary = await buildProgress(events);
    updateUI(summary);
};

const refreshProgressUi = async () => {
    const events = await loadEvents();
    await refreshProgressUiFromEvents(events);
};

const progressInputController = createProgressInputController({
    loadEvents,
    saveEvents,
    collectEventIds,
    minutesForInput,
    todayDay,
    practiceRecordedEventName: PRACTICE_RECORDED,
    onEventsUpdated: refreshProgressUiFromEvents,
});

const handleChange = (event) => {
    progressInputController.handleChange(event);
};

const resetProgress = async () => {
    const ok = window.confirm('Reset all progress and achievements? This cannot be undone.');
    if (!ok) return;
    await removeJSON(EVENT_KEY);
    await removeJSON(PERSIST_KEY);
    location.reload();
};

document.addEventListener('change', handleChange);
document.addEventListener(GAME_RECORDED, refreshProgressUi);
document.addEventListener(GOAL_TARGET_CHANGE, refreshProgressUi);
export const init = initProgress;
whenReady(initProgress);
