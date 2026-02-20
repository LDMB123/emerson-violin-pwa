import {
    MISSION_STEP_STATES,
    appendMissionHistory,
    loadCurriculumState,
    normalizeMission,
    updateMission,
} from './state.js';
import { saveMissionState } from './engine-mission-persistence.js';

export const completeMissionStep = async ({
    stepId,
    mission,
    unit,
    state,
    reason = 'step-complete',
} = {}) => {
    const normalized = normalizeMission(mission);
    if (!normalized || !stepId) return normalized;

    const steps = normalized.steps.map((step) => {
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
        ? Math.round((steps.filter((step) => step.status === MISSION_STEP_STATES.COMPLETE).length / steps.length) * 100)
        : 100;

    const updated = updateMission(normalized, {
        steps,
        currentStepId: nextCurrent?.id || normalized.currentStepId,
        completionPercent,
        status: completionPercent >= 100 ? 'complete' : 'active',
        completedAt: completionPercent >= 100 ? Date.now() : null,
    });

    const persistedState = await saveMissionState({
        state: state || (await loadCurriculumState()),
        mission: updated,
        unit: unit || { id: updated.unitId },
    });

    await appendMissionHistory({ mission: updated, reason });
    return {
        mission: updated,
        state: persistedState,
    };
};

export const startMissionStep = async ({
    stepId,
    mission,
    unit,
    state,
} = {}) => {
    const normalized = normalizeMission(mission);
    if (!normalized || !stepId) return normalized;

    const steps = normalized.steps.map((step) => {
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

    const persistedState = await saveMissionState({
        state: state || (await loadCurriculumState()),
        mission: updated,
        unit: unit || { id: updated.unitId },
    });
    await appendMissionHistory({ mission: updated, reason: 'step-start' });

    return {
        mission: updated,
        state: persistedState,
    };
};

export const insertRemediationForSkill = async ({
    mission,
    unit,
    skill,
    state,
} = {}) => {
    const normalizedMission = normalizeMission(mission);
    if (!normalizedMission || !unit || !skill) {
        return {
            mission: normalizedMission,
            state: state || (await loadCurriculumState()),
        };
    }

    const templates = unit?.missionTemplate?.remediation?.[skill] || [];
    if (!templates.length) {
        return {
            mission: normalizedMission,
            state: state || (await loadCurriculumState()),
        };
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

    const persistedState = await saveMissionState({
        state: state || (await loadCurriculumState()),
        mission: updated,
        unit,
    });
    await appendMissionHistory({ mission: updated, reason: `remediation:${skill}` });

    return {
        mission: updated,
        state: persistedState,
    };
};
