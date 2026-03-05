import { getJSON, setJSON } from '../persistence/storage.js';
import {
    CURRICULUM_STATE_KEY,
    MISSION_HISTORY_KEY,
} from '../persistence/storage-keys.js';
import { clampRounded, clone, finiteOrNow, percentageRounded } from '../utils/math.js';
import { asObjectOrFallback, mapArrayEntries } from '../utils/storage-utils.js';

const STATE_VERSION = 1;
const MAX_HISTORY = 240;

export const MISSION_STEP_STATES = Object.freeze({
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
    FAILED: 'failed',
    SKIPPED: 'skipped',
});

const STEP_STATE_SET = new Set(Object.values(MISSION_STEP_STATES));

const normalizeStep = (step, index) => {
    const status = STEP_STATE_SET.has(step?.status) ? step.status : MISSION_STEP_STATES.NOT_STARTED;
    return {
        id: step?.id || `step-${index + 1}`,
        type: step?.type || 'practice',
        label: step?.label || `Step ${index + 1}`,
        target: step?.target || '',
        status,
        startedAt: Number.isFinite(step?.startedAt) ? step.startedAt : null,
        completedAt: Number.isFinite(step?.completedAt) ? step.completedAt : null,
        source: step?.source || 'plan',
        remediationFor: step?.remediationFor || null,
    };
};

const computeCompletionPercent = (steps = []) => {
    if (!steps.length) return 0;
    const completedCount = steps.filter((step) => step.status === MISSION_STEP_STATES.COMPLETE).length;
    return percentageRounded(completedCount, steps.length);
};

export const normalizeMission = (mission) => {
    if (!mission || typeof mission !== 'object') return null;
    const steps = Array.isArray(mission.steps)
        ? mission.steps.map(normalizeStep)
        : [];

    const computedCurrent = steps.find((step) => step.status === MISSION_STEP_STATES.IN_PROGRESS)
        || steps.find((step) => step.status === MISSION_STEP_STATES.NOT_STARTED)
        || steps[steps.length - 1]
        || null;

    const remediationStepIds = steps
        .filter((step) => step.source === 'remediation')
        .map((step) => step.id);

    return {
        id: mission.id || '',
        unitId: mission.unitId || '',
        phase: mission.phase || 'foundation',
        tier: mission.tier || 'beginner',
        steps,
        currentStepId: mission.currentStepId || computedCurrent?.id || null,
        remediationStepIds: Array.isArray(mission.remediationStepIds)
            ? mission.remediationStepIds.filter(Boolean)
            : remediationStepIds,
        completionPercent: Number.isFinite(mission.completionPercent)
            ? clampRounded(mission.completionPercent, 0, 100)
            : computeCompletionPercent(steps),
        status: mission.status || (computeCompletionPercent(steps) >= 100 ? 'complete' : 'active'),
        createdAt: finiteOrNow(mission.createdAt),
        updatedAt: finiteOrNow(mission.updatedAt),
        pausedAt: Number.isFinite(mission.pausedAt) ? mission.pausedAt : null,
        completedAt: Number.isFinite(mission.completedAt) ? mission.completedAt : null,
    };
};

const defaultState = () => ({
    version: STATE_VERSION,
    currentUnitId: null,
    activeMissionId: null,
    currentMission: null,
    completedUnitIds: [],
    unitProgress: {},
    lastUpdatedAt: Date.now(),
});

const normalizeState = (stored) => {
    const source = asObjectOrFallback(stored, {});
    const mission = normalizeMission(source.currentMission);
    return {
        version: STATE_VERSION,
        currentUnitId: typeof source.currentUnitId === 'string' ? source.currentUnitId : mission?.unitId || null,
        activeMissionId: typeof source.activeMissionId === 'string' ? source.activeMissionId : mission?.id || null,
        currentMission: mission,
        completedUnitIds: Array.isArray(source.completedUnitIds) ? source.completedUnitIds.filter(Boolean) : [],
        unitProgress: source.unitProgress && typeof source.unitProgress === 'object' ? source.unitProgress : {},
        lastUpdatedAt: finiteOrNow(source.lastUpdatedAt),
    };
};

const normalizeHistoryEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const mission = normalizeMission(entry.mission || entry);
    if (!mission?.id) return null;
    return {
        mission,
        reason: entry.reason || 'snapshot',
        at: finiteOrNow(entry.at),
    };
};

export const loadCurriculumState = async () => {
    const stored = await getJSON(CURRICULUM_STATE_KEY);
    return normalizeState(stored);
};

export const saveCurriculumState = async (state) => {
    const normalized = normalizeState(state);
    normalized.lastUpdatedAt = Date.now();
    await setJSON(CURRICULUM_STATE_KEY, normalized);
    return clone(normalized);
};

const loadMissionHistory = async () => {
    const stored = await getJSON(MISSION_HISTORY_KEY);
    return mapArrayEntries(stored, normalizeHistoryEntry).slice(-MAX_HISTORY);
};

export const appendMissionHistory = async (entry) => {
    const history = await loadMissionHistory();
    const nextEntry = normalizeHistoryEntry(entry);
    if (!nextEntry) return history;
    const next = [...history, nextEntry].slice(-MAX_HISTORY);
    await setJSON(MISSION_HISTORY_KEY, next);
    return next;
};

export const clearCurriculumState = async () => {
    const state = defaultState();
    await setJSON(CURRICULUM_STATE_KEY, state);
    await setJSON(MISSION_HISTORY_KEY, []);
    return state;
};

export const createMission = ({
    id,
    unitId,
    phase,
    tier,
    steps,
    now = Date.now(),
} = {}) => {
    const normalizedSteps = Array.isArray(steps)
        ? steps.map((step, index) => normalizeStep({ ...step, status: step?.status || MISSION_STEP_STATES.NOT_STARTED }, index))
        : [];
    const firstStep = normalizedSteps[0] || null;

    return normalizeMission({
        id,
        unitId,
        phase,
        tier,
        steps: normalizedSteps,
        currentStepId: firstStep?.id || null,
        remediationStepIds: normalizedSteps.filter((step) => step.source === 'remediation').map((step) => step.id),
        completionPercent: computeCompletionPercent(normalizedSteps),
        status: normalizedSteps.length ? 'active' : 'complete',
        createdAt: now,
        updatedAt: now,
    });
};

export const updateMission = (mission, updates = {}) => {
    const base = normalizeMission(mission) || createMission({ id: updates.id || '', steps: [] });
    const merged = {
        ...base,
        ...updates,
        steps: Array.isArray(updates.steps)
            ? updates.steps.map(normalizeStep)
            : base.steps,
    };
    return normalizeMission({
        ...merged,
        updatedAt: Date.now(),
    });
};
