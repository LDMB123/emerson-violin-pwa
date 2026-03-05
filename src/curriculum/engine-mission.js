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

export const completeMissionStep = async (params = {}) => {
    const { state, unit, reason = 'step-complete' } = params;
    return withStepMission(params, async (normalized, stepId) => {
        const steps = mapMissionSteps(normalized.steps, (step) => {
            if (step.id !== stepId) return step;
            return {
                ...step,
                status: MISSION_STEP_STATES.COMPLETE,
                completedAt: Date.now(),
            };
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
            completedAt: completionPercent >= 100 ? Date.now() : null,
        });

        return persistMissionUpdate({ mission: updated, state, unit, reason });
    });
};

export const startMissionStep = async (params = {}) => {
    const { state, unit } = params;
    return withStepMission(params, async (normalized, stepId) => {
        const steps = mapMissionSteps(normalized.steps, (step) => {
            if (step.id !== stepId) {
                if (step.status === MISSION_STEP_STATES.IN_PROGRESS) {
                    return { ...step, status: MISSION_STEP_STATES.NOT_STARTED };
                }
                return step;
            }
            return {
                ...step,
                status: MISSION_STEP_STATES.IN_PROGRESS,
                startedAt: Date.now(),
            };
        });

        const updated = updateMission(normalized, {
            steps,
            currentStepId: stepId,
        });

        return persistMissionUpdate({ mission: updated, state, unit, reason: 'step-start' });
    });
};

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
