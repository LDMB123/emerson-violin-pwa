import { todayDay } from '../utils/math.js';
import {
    MISSION_STEP_STATES,
    appendMissionHistory,
    createMission,
    normalizeMission,
    saveCurriculumState,
} from './state.js';
import { FLOW_REGRESSING, PHASE_BY_FLOW } from './engine-flow.js';

const buildMissionId = ({ unit, phase, day, sequence = 0 }) => {
    const seq = Math.max(0, sequence);
    return `mission-${unit.id}-${day}-${phase}-${seq}`;
};

const buildMissionSteps = ({ unit, weakestSkill, flow }) => {
    const baseSteps = Array.isArray(unit?.missionTemplate?.steps)
        ? unit.missionTemplate.steps
        : [];

    const steps = baseSteps.map((step, index) => ({
        ...step,
        id: step.id || `step-${index + 1}`,
        status: MISSION_STEP_STATES.NOT_STARTED,
        source: 'plan',
    }));

    if (flow !== FLOW_REGRESSING) {
        return steps;
    }

    const remediationPool = unit?.missionTemplate?.remediation?.[weakestSkill] || [];
    const remediationSteps = remediationPool.map((step, index) => ({
        ...step,
        id: `${step.id || `remediation-${index + 1}`}`,
        status: MISSION_STEP_STATES.NOT_STARTED,
        source: 'remediation',
        remediationFor: weakestSkill || null,
    }));

    if (!remediationSteps.length) {
        return steps;
    }

    const insertAt = Math.min(1, steps.length);
    return [
        ...steps.slice(0, insertAt),
        ...remediationSteps,
        ...steps.slice(insertAt),
    ];
};

const hasActiveMission = (mission) => {
    const normalized = normalizeMission(mission);
    if (!normalized) return false;
    return normalized.status !== 'complete';
};

export const saveMissionState = async ({ state, mission, unit }) => {
    const completedUnitIds = Array.isArray(state.completedUnitIds) ? [...state.completedUnitIds] : [];
    if (mission.status === 'complete' && unit?.id && !completedUnitIds.includes(unit.id)) {
        completedUnitIds.push(unit.id);
    }

    const nextState = {
        ...state,
        currentUnitId: unit?.id || state.currentUnitId || null,
        activeMissionId: mission.id,
        currentMission: mission,
        completedUnitIds,
        unitProgress: {
            ...(state.unitProgress || {}),
            [unit?.id || mission.unitId || 'unknown']: {
                missionId: mission.id,
                completionPercent: mission.completionPercent,
                status: mission.status,
                updatedAt: Date.now(),
            },
        },
    };

    return saveCurriculumState(nextState);
};

export const ensurePersistedMission = async ({
    snapshot,
    recommendations,
    forceRegenerate = false,
} = {}) => {
    const { state, unit, flow, events: sourceEvents } = snapshot;

    if (!unit) {
        return {
            mission: null,
            persistedState: state,
        };
    }

    const existingMission = normalizeMission(state.currentMission);
    if (!forceRegenerate && hasActiveMission(existingMission)) {
        return {
            mission: existingMission,
            persistedState: state,
        };
    }

    const day = todayDay();
    const phase = PHASE_BY_FLOW[flow] || 'core';
    const weakestSkill = recommendations?.weakestSkill || null;
    const steps = buildMissionSteps({ unit, weakestSkill, flow });

    const missionId = buildMissionId({
        unit,
        phase,
        day,
        sequence: sourceEvents.length,
    });

    const mission = createMission({
        id: missionId,
        unitId: unit.id,
        phase,
        tier: unit.tier,
        steps,
    });

    const persistedState = await saveMissionState({ state, mission, unit });
    await appendMissionHistory({ mission, reason: existingMission ? 'regenerated' : 'created' });

    return {
        mission,
        persistedState,
    };
};
