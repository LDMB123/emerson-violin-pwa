import {
    MISSION_STEP_STATES,
    appendMissionHistory,
    loadCurriculumState,
    normalizeMission,
    updateMission,
} from './state.js';
import { percentageRounded } from '../utils/math.js';
import { saveMissionState } from './engine-mission-persistence.js';

const persistMissionUpdate = async ({ mission, state, unit, reason }) => {
    const persistedState = await saveMissionState({
        state: state || (await loadCurriculumState()),
        mission,
        unit: unit || { id: mission.unitId },
    });
    if (reason) {
        await appendMissionHistory({ mission, reason });
    }
    return {
        mission,
        state: persistedState,
    };
};

const mapMissionSteps = (steps, mapStep) => steps.map((step) => mapStep(step));

const resolveMissionAndState = async ({ mission, state } = {}) => ({
    mission,
    state: state || (await loadCurriculumState()),
});

const resolveNormalizedMissionState = async (normalizedMission, state) => resolveMissionAndState({
    mission: normalizedMission,
    state,
});

const withStepMission = async ({ mission, stepId } = {}, applyStepUpdate = async () => null) => {
    const normalized = normalizeMission(mission);
    if (!normalized || !stepId) return normalized;
    return applyStepUpdate(normalized, stepId);
};

const mapStepById = (steps, stepId, {
    onMatch,
    onMismatch = (step) => step,
}) => mapMissionSteps(steps, (step) => {
    if (step.id !== stepId) return onMismatch(step);
    return onMatch(step);
});

const stepWithStatusAt = (step, status, timestampKey, timestamp) => ({
    ...step,
    status,
    [timestampKey]: timestamp,
});

const mapStepStatus = ({
    steps,
    stepId,
    status,
    timestampKey,
    onMismatch,
}) => {
    const now = Date.now();
    return {
        now,
        steps: mapStepById(steps, stepId, {
            onMatch: (step) => stepWithStatusAt(step, status, timestampKey, now),
            onMismatch,
        }),
    };
};

const withPersistedStepMission = (params = {}, reason, buildUpdatedMission = () => null) => {
    const { state, unit } = params;
    return withStepMission(params, async (normalized, stepId) => {
        const updated = buildUpdatedMission({ normalized, stepId });
        return persistMissionUpdate({ mission: updated, state, unit, reason });
    });
};

/** Marks a mission step complete, updates derived mission progress, and persists it. */
export const completeMissionStep = async (params = {}) => {
    const reason = params.reason || 'step-complete';
    return withPersistedStepMission(params, reason, ({ normalized, stepId }) => {
        const { now, steps } = mapStepStatus({
            steps: normalized.steps,
            stepId,
            status: MISSION_STEP_STATES.COMPLETE,
            timestampKey: 'completedAt',
        });

        const nextCurrent = steps.find((step) => step.status === MISSION_STEP_STATES.IN_PROGRESS)
            || steps.find((step) => step.status === MISSION_STEP_STATES.NOT_STARTED)
            || null;

        const completionPercent = steps.length
            ? percentageRounded(steps.filter((step) => step.status === MISSION_STEP_STATES.COMPLETE).length, steps.length)
            : 100;

        const updated = updateMission(normalized, {
            steps,
            currentStepId: nextCurrent?.id || normalized.currentStepId,
            completionPercent,
            status: completionPercent >= 100 ? 'complete' : 'active',
            completedAt: completionPercent >= 100 ? now : null,
        });
        return updated;
    });
};

/** Marks one mission step in progress and persists the updated mission state. */
export const startMissionStep = async (params = {}) => {
    return withPersistedStepMission(params, 'step-start', ({ normalized, stepId }) => {
        const sourceSteps = normalized.steps;
        const { steps } = mapStepStatus({
            steps: sourceSteps,
            stepId,
            status: MISSION_STEP_STATES.IN_PROGRESS,
            timestampKey: 'startedAt',
            onMismatch: (step) => {
                if (step.status === MISSION_STEP_STATES.IN_PROGRESS) {
                    return { ...step, status: MISSION_STEP_STATES.NOT_STARTED };
                }
                return step;
            },
        });

        const updated = updateMission(normalized, {
            steps,
            currentStepId: stepId,
        });
        return updated;
    });
};

/** Inserts remediation steps after the current step for the supplied weak skill. */
export const insertRemediationForSkill = async ({
    mission,
    unit,
    skill,
    state,
} = {}) => {
    const normalizedMission = normalizeMission(mission);
    if (!normalizedMission || !unit || !skill) {
        return resolveNormalizedMissionState(normalizedMission, state);
    }

    const templates = unit?.missionTemplate?.remediation?.[skill] || [];
    if (!templates.length) {
        return resolveNormalizedMissionState(normalizedMission, state);
    }

    const currentIndex = normalizedMission.steps.findIndex((step) => step.id === normalizedMission.currentStepId);
    const insertIndex = currentIndex >= 0 ? currentIndex + 1 : normalizedMission.steps.length;
    const timestamp = Date.now();

    const remediationSteps = templates.map((step, index) => ({
        id: `${step.id || `remediation-${skill}-${index + 1}`}-${timestamp}`,
        type: step.type || 'trainer',
        label: step.label || `Remediation: ${skill}`,
        target: step.target || '',
        status: MISSION_STEP_STATES.NOT_STARTED,
        source: 'remediation',
        remediationFor: skill,
    }));

    const steps = [
        ...normalizedMission.steps.slice(0, insertIndex),
        ...remediationSteps,
        ...normalizedMission.steps.slice(insertIndex),
    ];

    const remediationStepIds = [
        ...(normalizedMission.remediationStepIds || []),
        ...remediationSteps.map((step) => step.id),
    ];

    const updated = updateMission(normalizedMission, {
        steps,
        remediationStepIds,
    });

    return persistMissionUpdate({ mission: updated, state, unit, reason: `remediation:${skill}` });
};
