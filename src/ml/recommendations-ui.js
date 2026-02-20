import { getLearningRecommendations } from './recommendations.js';
import {
    GOAL_TARGET_CHANGE,
    MISSION_UPDATED,
    ML_UPDATE,
    ML_RESET,
    ML_RECS,
} from '../utils/event-names.js';
import {
    updateLessonPanel,
    renderLessonSteps,
    updateGoalInputs,
    resolveMissionSteps,
    resolveTotalMinutes,
} from './recommendations-ui-render.js';

let panels = [];
let stepLists = [];
let goalList = null;
let globalsBound = false;
let refreshInFlight = null;
let refreshQueued = false;

const resolveElements = () => {
    panels = Array.from(document.querySelectorAll('[data-lesson-plan]'));
    stepLists = Array.from(document.querySelectorAll('[data-lesson-steps]'));
    goalList = document.querySelector('[data-goal-list]');
};

const hasConnectedTargets = () => (
    panels.some((panel) => panel?.isConnected)
    || stepLists.some((list) => list?.isConnected)
    || Boolean(goalList?.isConnected)
);

const setDailyGoalTarget = (total) => {
    const value = Math.max(5, Math.round(total || 15));
    document.documentElement.dataset.dailyGoalTarget = String(value);
    const targetEl = document.querySelector('[data-progress="daily-goal-value"]');
    if (targetEl) targetEl.textContent = String(value);
    document.dispatchEvent(new CustomEvent(GOAL_TARGET_CHANGE, { detail: { value } }));
};

const runRefreshPanels = async () => {
    resolveElements();
    if (!hasConnectedTargets()) return;

    const recs = await getLearningRecommendations();
    panels.forEach((panel) => {
        if (panel?.isConnected) updateLessonPanel(panel, recs);
    });
    const missionSteps = resolveMissionSteps(recs);
    if (missionSteps.length) {
        stepLists.forEach((list) => {
            if (list?.isConnected) renderLessonSteps(list, missionSteps);
        });
        updateGoalInputs(goalList, missionSteps);
    }
    const total = resolveTotalMinutes(recs, missionSteps);
    if (total) {
        setDailyGoalTarget(total);
    }
};

const refreshPanels = async () => {
    if (refreshInFlight) {
        refreshQueued = true;
        return refreshInFlight;
    }

    refreshInFlight = runRefreshPanels()
        .catch(() => {})
        .finally(() => {
            refreshInFlight = null;
        });
    await refreshInFlight;

    if (refreshQueued) {
        refreshQueued = false;
        return refreshPanels();
    }
    return null;
};

const bindGlobalListeners = () => {
    if (globalsBound) return;
    globalsBound = true;
    document.addEventListener(ML_UPDATE, refreshPanels);
    document.addEventListener(ML_RESET, refreshPanels);
    document.addEventListener(ML_RECS, refreshPanels);
    document.addEventListener(MISSION_UPDATED, refreshPanels);
};

const initRecommendationsUi = () => {
    resolveElements();
    bindGlobalListeners();
    refreshPanels();
};

export const init = initRecommendationsUi;
