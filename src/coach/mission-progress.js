import {
    COACH_MISSION_COMPLETE,
    MISSION_UPDATED,
} from '../utils/event-names.js';
import {
    completeMissionStep,
    insertRemediationForSkill,
    startMissionStep,
} from '../curriculum/engine.js';
import { getCurriculumUnit } from '../curriculum/content-loader.js';
import { getLearningRecommendations, refreshRecommendationsCache } from '../ml/recommendations.js';
import {
    GOAL_SLOT_IDS,
    GOAL_SLOT_DEFAULTS,
    queueGoal,
    readQueuedGoals,
    writeQueuedGoals,
} from './mission-progress-goals.js';
import { bindMissionProgressListeners } from './mission-progress-listeners.js';
import {
    applyMissionGoalList,
    computeMissionProgressValues,
    flushQueuedMissionGoals,
    markMissionGoal,
    resolveMissionGoalInputs,
} from './mission-progress-goal-dom.js';
import { createMissionProgressHandlers } from './mission-progress-handlers.js';
import {
    ensureMissionUiNodes,
    renderHomeMissionSummary,
    renderMissionGoalList,
    renderMissionStatus,
    renderMissionTimeline,
} from './mission-progress-render.js';
import {
    createMissionProgressContext,
    isMissionProgressGenerationActive,
    nextMissionProgressGeneration,
} from './mission-progress-state.js';

const missionContext = createMissionProgressContext();
let missionHandlers = null;

const missionProgressValues = () => {
    const goalInputs = resolveMissionGoalInputs();
    return computeMissionProgressValues({
        missionState: missionContext.mission,
        goalInputs,
        goalSlotIds: GOAL_SLOT_IDS,
    });
};

const bindGoalInputs = () => {
    resolveMissionGoalInputs().forEach((input) => {
        if (input.dataset.coachGoalBound === 'true') return;
        input.dataset.coachGoalBound = 'true';
        input.addEventListener('change', async () => {
            if (!input.checked) return;
            const stepId = input.dataset.stepId;
            if (stepId) {
                await updateMissionStep({ stepId, type: 'complete' });
            }
            updateMissionStatus();
        });
    });
};

const applyGoalStateFromMission = () => {
    const applied = applyMissionGoalList({
        missionState: missionContext.mission,
        goalSlotIds: GOAL_SLOT_IDS,
        goalSlotDefaults: GOAL_SLOT_DEFAULTS,
        renderMissionGoalList,
    });
    if (!applied) return;
    bindGoalInputs();
};

const dispatchMissionUpdated = () => {
    document.dispatchEvent(new CustomEvent(MISSION_UPDATED, {
        detail: {
            mission: missionContext.mission,
        },
    }));
};

const updateMissionStatus = () => {
    const { completed, total, complete } = missionProgressValues();
    renderMissionStatus({ completed, total, complete });
    renderHomeMissionSummary({ missionState: missionContext.mission, complete });

    if (complete && !missionContext.completionDispatched) {
        missionContext.completionDispatched = true;
        document.dispatchEvent(new CustomEvent(COACH_MISSION_COMPLETE, {
            detail: {
                completed,
                total,
                missionId: missionContext.mission?.id,
                timestamp: Date.now(),
            },
        }));
    }

    if (!complete) {
        missionContext.completionDispatched = false;
    }
};

const refreshMissionUi = () => {
    renderMissionTimeline({ missionState: missionContext.mission });
    applyGoalStateFromMission();
    updateMissionStatus();
    dispatchMissionUpdated();
};

const markGoal = (goalId, { queueIfMissing = true } = {}) => {
    return markMissionGoal({
        goalId,
        goalSlotIds: GOAL_SLOT_IDS,
        missionState: missionContext.mission,
        queueGoal,
        queueIfMissing,
    });
};

const flushQueuedGoals = () => {
    flushQueuedMissionGoals({
        readQueuedGoals,
        writeQueuedGoals,
        markGoal,
    });
};

const applyMissionResult = (result) => {
    if (!result?.mission) return false;
    missionContext.mission = result.mission;
    refreshMissionUi();
    refreshRecommendationsCache().catch(() => {});
    return true;
};

const updateMissionStep = (...args) => missionHandlers?.updateMissionStep(...args);
const maybeInsertRemediation = (...args) => missionHandlers?.maybeInsertRemediation(...args);
const handleGoalFromActivity = (...args) => missionHandlers?.handleGoalFromActivity(...args);
const handleLessonStep = (...args) => missionHandlers?.handleLessonStep(...args);

const refreshMissionFromRecommendations = async ({ forceFresh = false, generation = null } = {}) => {
    const recs = await getLearningRecommendations({ allowCached: !forceFresh });
    if (!isMissionProgressGenerationActive(missionContext, generation)) return false;
    missionContext.weakestSkill = recs?.weakestSkill || missionContext.weakestSkill;
    missionContext.mission = recs?.mission || null;
    missionContext.unit = missionContext.mission?.unitId
        ? await getCurriculumUnit(missionContext.mission.unitId)
        : null;
    if (!isMissionProgressGenerationActive(missionContext, generation)) return false;
    refreshMissionUi();
    return true;
};

const initMissionProgress = async () => {
    const generation = nextMissionProgressGeneration(missionContext);
    missionHandlers = createMissionProgressHandlers({
        missionContext,
        applyMissionResult,
        updateMissionStatus,
        markGoal,
        completeMissionStep,
        startMissionStep,
        insertRemediationForSkill,
    });
    bindMissionProgressListeners({
        handleLessonStep,
        updateMissionStatus,
        handleGoalFromActivity,
        maybeInsertRemediation,
    });
    ensureMissionUiNodes();
    await refreshMissionFromRecommendations({ forceFresh: false, generation });
    if (!isMissionProgressGenerationActive(missionContext, generation)) return;
    bindGoalInputs();
    flushQueuedGoals();
    updateMissionStatus();
};

export const init = initMissionProgress;
