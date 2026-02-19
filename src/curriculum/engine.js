import { loadEvents } from '../persistence/loaders.js';
import { todayDay } from '../utils/math.js';
import { getCurriculumContent } from './content-loader.js';
import {
    MISSION_STEP_STATES,
    appendMissionHistory,
    createMission,
    loadCurriculumState,
    normalizeMission,
    saveCurriculumState,
    updateMission,
} from './state.js';

const FLOW_FIRST_TIME = 'first_time';
const FLOW_PROGRESSING = 'progressing';
const FLOW_REGRESSING = 'regressing';
const FLOW_STABLE = 'stable';

const PHASE_BY_FLOW = {
    [FLOW_FIRST_TIME]: 'onramp',
    [FLOW_PROGRESSING]: 'advance',
    [FLOW_REGRESSING]: 'remediation',
    [FLOW_STABLE]: 'core',
};

const asNumber = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const average = (values) => {
    if (!values.length) return 0;
    const total = values.reduce((sum, value) => sum + asNumber(value), 0);
    return total / values.length;
};

const recentPerformance = (events = []) => {
    const qualityEvents = events
        .filter((event) => event && typeof event === 'object')
        .filter((event) => event.type === 'game' || event.type === 'song')
        .map((event) => ({
            accuracy: Number.isFinite(event.accuracy) ? event.accuracy : Number.isFinite(event.score) ? event.score : 0,
            timestamp: Number.isFinite(event.timestamp) ? event.timestamp : 0,
        }))
        .sort((left, right) => left.timestamp - right.timestamp);

    const lastSix = qualityEvents.slice(-6).map((event) => event.accuracy);
    const previousSix = qualityEvents.slice(-12, -6).map((event) => event.accuracy);

    return {
        total: qualityEvents.length,
        recentAvg: average(lastSix),
        previousAvg: average(previousSix),
    };
};

const summarizeUnitCompletion = (unit, events = []) => {
    const requiredGames = new Set(unit?.requiredObjectives?.games || []);
    const requiredSongs = new Set(unit?.requiredObjectives?.songs || []);
    const requiredMinutes = Math.max(0, Number(unit?.requiredObjectives?.practiceMinutes || 0));

    const gameDone = new Set();
    const songDone = new Set();
    let practiceMinutes = 0;

    events.forEach((event) => {
        if (!event || typeof event !== 'object') return;
        if (event.type === 'game' && requiredGames.has(event.id)) {
            const score = Number.isFinite(event.accuracy) ? event.accuracy : event.score;
            if (Number.isFinite(score) && score >= 60) {
                gameDone.add(event.id);
            }
        }
        if (event.type === 'song' && requiredSongs.has(event.id)) {
            const score = Number.isFinite(event.accuracy) ? event.accuracy : event.score;
            if (Number.isFinite(score) && score >= 60) {
                songDone.add(event.id);
            }
        }
        if (event.type === 'practice') {
            practiceMinutes += asNumber(event.minutes, 0);
        }
    });

    const gameRatio = requiredGames.size ? gameDone.size / requiredGames.size : 1;
    const songRatio = requiredSongs.size ? songDone.size / requiredSongs.size : 1;
    const practiceRatio = requiredMinutes ? Math.min(1, practiceMinutes / requiredMinutes) : 1;
    const completion = Math.round(((gameRatio + songRatio + practiceRatio) / 3) * 100);

    return {
        completion,
        gameRatio,
        songRatio,
        practiceRatio,
    };
};

const resolveFlow = ({ total, recentAvg, previousAvg }) => {
    if (total === 0) return FLOW_FIRST_TIME;
    if (recentAvg < 65) {
        return FLOW_REGRESSING;
    }
    if (recentAvg <= previousAvg - 6) {
        return FLOW_REGRESSING;
    }
    if (recentAvg >= previousAvg + 6 || (recentAvg >= 80 && previousAvg === 0)) {
        return FLOW_PROGRESSING;
    }
    return FLOW_STABLE;
};

const findUnitIndex = (units, currentUnitId) => {
    if (!Array.isArray(units) || !units.length) return 0;
    const index = units.findIndex((unit) => unit.id === currentUnitId);
    return index >= 0 ? index : 0;
};

const clampUnitIndex = (index, totalUnits) => {
    if (!Number.isFinite(index)) return 0;
    if (!totalUnits || totalUnits <= 1) return 0;
    return Math.max(0, Math.min(totalUnits - 1, Math.round(index)));
};

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

const chooseUnit = ({ units, state, flow, events }) => {
    if (!units.length) return null;

    const currentIndex = findUnitIndex(units, state.currentUnitId);
    const currentUnit = units[currentIndex];
    const completion = summarizeUnitCompletion(currentUnit, events).completion;

    let targetIndex = currentIndex;
    if (flow === FLOW_PROGRESSING && completion >= 75) {
        targetIndex = currentIndex + 1;
    } else if (flow === FLOW_REGRESSING && completion <= 45) {
        targetIndex = currentIndex - 1;
    }

    if (!state.currentUnitId && flow === FLOW_FIRST_TIME) {
        targetIndex = 0;
    }

    targetIndex = clampUnitIndex(targetIndex, units.length);
    return units[targetIndex] || units[0];
};

const saveMissionState = async ({ state, mission, unit }) => {
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

const getCurriculumSnapshot = async ({ events } = {}) => {
    const [content, state, sourceEvents] = await Promise.all([
        getCurriculumContent(),
        loadCurriculumState(),
        Array.isArray(events) ? Promise.resolve(events) : loadEvents(),
    ]);

    const performance = recentPerformance(sourceEvents);
    const flow = resolveFlow(performance);
    const units = Array.isArray(content.units) ? content.units : [];
    const unit = chooseUnit({ units, state, flow, events: sourceEvents }) || units[0] || null;

    return {
        content,
        state,
        events: sourceEvents,
        flow,
        performance,
        unit,
    };
};

export const ensureCurrentMission = async ({
    recommendations,
    events,
    forceRegenerate = false,
} = {}) => {
    const snapshot = await getCurriculumSnapshot({ events });
    const { state, unit, flow, events: sourceEvents } = snapshot;

    if (!unit) {
        return {
            ...snapshot,
            mission: null,
            persistedState: state,
        };
    }

    const existingMission = normalizeMission(state.currentMission);
    if (!forceRegenerate && hasActiveMission(existingMission)) {
        return {
            ...snapshot,
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
        ...snapshot,
        mission,
        persistedState,
    };
};

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
