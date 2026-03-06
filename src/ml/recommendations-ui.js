import { getLearningRecommendations } from './recommendations.js';
import {
    GOAL_TARGET_CHANGE,
    MISSION_UPDATED,
    ML_UPDATE,
    ML_RESET,
    ML_RECS,
    emitEvent,
} from '../utils/event-names.js';
import {
    updateLessonPanel,
    renderLessonSteps,
    updateGoalInputs,
    resolveMissionSteps,
    resolveTotalMinutes,
} from './recommendations-ui-render.js';
import { createQueuedAsyncRunner } from '../utils/queued-async-runner.js';
import {
    createOnceBinder,
} from '../utils/lifecycle-utils.js';
import { createRunOnceDocumentBinder } from '../utils/event-handlers.js';

let panels = [];
let stepLists = [];
let goalList = null;

const resolveElements = () => {
    panels = Array.from(document.querySelectorAll('[data-lesson-plan]'));
    stepLists = Array.from(document.querySelectorAll('[data-lesson-steps]'));
    goalList = document.querySelector('[data-goal-list]');
};
const claimGlobalListenersBinding = createOnceBinder();

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
    emitEvent(GOAL_TARGET_CHANGE, { value });
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

const refreshPanels = createQueuedAsyncRunner(runRefreshPanels);

const bindGlobalListeners = createRunOnceDocumentBinder(
    claimGlobalListenersBinding,
    [ML_UPDATE, ML_RESET, ML_RECS, MISSION_UPDATED],
    refreshPanels,
);

const initRecommendationsUi = () => {
    resolveElements();
    bindGlobalListeners();
    refreshPanels();
};

/**
 * Initializes the recommendations UI and refreshes lesson-plan panels from the latest model output.
 */
export const init = initRecommendationsUi;
