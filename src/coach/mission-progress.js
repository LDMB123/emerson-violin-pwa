import {
    COACH_MISSION_COMPLETE,
    GAME_RECORDED,
    LESSON_COMPLETE,
    LESSON_STEP,
    MISSION_UPDATED,
    PRACTICE_RECORDED,
    PRACTICE_STEP_COMPLETED,
    PRACTICE_STEP_STARTED,
    SONG_RECORDED,
} from '../utils/event-names.js';
import {
    completeMissionStep,
    insertRemediationForSkill,
    startMissionStep,
} from '../curriculum/engine.js';
import { getCurriculumUnit } from '../curriculum/content-loader.js';
import { getLearningRecommendations, refreshRecommendationsCache } from '../ml/recommendations.js';

const AUTO_GOALS_KEY = 'panda-violin:coach-auto-goals:v1';

const GOAL_BY_GAME = Object.freeze({
    'pitch-quest': 'goal-warmup',
    'tuning-time': 'goal-warmup',
    'scale-practice': 'goal-scale',
    'string-quest': 'goal-scale',
    'bow-hero': 'goal-scale',
    'rhythm-dash': 'goal-rhythm',
    'rhythm-painter': 'goal-rhythm',
    pizzicato: 'goal-rhythm',
    'ear-trainer': 'goal-ear',
    'duet-challenge': 'goal-ear',
    'story-song': 'goal-song',
    'melody-maker': 'goal-song',
    'note-memory': 'goal-song',
});

const GOAL_SLOT_IDS = Object.freeze(['goal-warmup', 'goal-scale', 'goal-rhythm', 'goal-ear', 'goal-song']);
const GOAL_SLOT_DEFAULTS = Object.freeze({
    'goal-warmup': { minutes: 3, label: 'Warm-up open strings' },
    'goal-scale': { minutes: 4, label: 'Slow scale focus' },
    'goal-rhythm': { minutes: 3, label: 'Metronome rhythm drill' },
    'goal-ear': { minutes: 2, label: 'Match pitches by ear' },
    'goal-song': { minutes: 3, label: 'Play one song slowly' },
});

let globalsBound = false;
let missionState = null;
let missionUnit = null;
let weakestSkill = 'pitch';
let completionDispatched = false;

const readQueuedGoals = () => {
    try {
        const stored = JSON.parse(window.localStorage.getItem(AUTO_GOALS_KEY) || '[]');
        if (!Array.isArray(stored)) return [];
        return stored.filter((value, index, list) => (
            typeof value === 'string'
            && value.trim()
            && list.indexOf(value) === index
        ));
    } catch {
        return [];
    }
};

const writeQueuedGoals = (goals) => {
    try {
        window.localStorage.setItem(AUTO_GOALS_KEY, JSON.stringify(goals));
    } catch {
        // Ignore local storage write failures.
    }
};

const queueGoal = (goalId) => {
    if (!goalId) return;
    const queued = readQueuedGoals();
    if (queued.includes(goalId)) return;
    queued.push(goalId);
    writeQueuedGoals(queued);
};

const resolveGoalInputs = () => (
    Array.from(document.querySelectorAll('#view-coach [data-goal-list] input[type="checkbox"][id]'))
);

const missionProgressValues = () => {
    const goalInputs = resolveGoalInputs();
    if (goalInputs.length) {
        const total = Math.max(goalInputs.length, GOAL_SLOT_IDS.length);
        const completed = goalInputs.filter((input) => input.checked).length;
        return {
            completed,
            total,
            complete: total > 0 && completed >= total,
        };
    }

    if (!missionState?.steps?.length) {
        return {
            completed: 0,
            total: 0,
            complete: false,
        };
    }
    const total = missionState.steps.length;
    const completed = missionState.steps.filter((step) => step.status === 'complete').length;
    return {
        completed,
        total,
        complete: total > 0 && completed >= total,
    };
};

const ensureMissionStatus = () => {
    const coachView = document.getElementById('view-coach');
    if (!coachView) return null;
    let status = coachView.querySelector('[data-coach-mission-status]');
    if (status) return status;
    const stepper = coachView.querySelector('[data-coach-stepper]');
    if (!stepper?.parentElement) return null;

    status = document.createElement('p');
    status.className = 'coach-mission-status glass';
    status.dataset.coachMissionStatus = 'true';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Mission progress: 0/0 goals complete.';

    stepper.parentElement.insertBefore(status, stepper.nextSibling);
    return status;
};

const ensureMissionTimeline = () => {
    const coachView = document.getElementById('view-coach');
    if (!coachView) return null;

    let timeline = coachView.querySelector('[data-coach-mission-timeline]');
    if (timeline) return timeline;

    const targetCard = coachView.querySelector('[data-coach-step-card="play"] .lesson-plan')
        || coachView.querySelector('[data-coach-step-card="play"]');
    if (!targetCard) return null;

    timeline = document.createElement('ol');
    timeline.className = 'mission-timeline';
    timeline.dataset.coachMissionTimeline = 'true';
    targetCard.appendChild(timeline);
    return timeline;
};

const ensureHomeMissionSummary = () => {
    const home = document.getElementById('view-home');
    if (!home) return null;
    let summary = home.querySelector('[data-home-mission-summary]');
    if (summary) return summary;

    const missionActions = home.querySelector('.mission-actions');
    if (!missionActions?.parentElement) return null;

    summary = document.createElement('p');
    summary.className = 'home-mission-summary';
    summary.dataset.homeMissionSummary = 'true';
    summary.setAttribute('aria-live', 'polite');
    summary.textContent = 'Mission ready.';
    missionActions.parentElement.insertBefore(summary, missionActions.nextSibling);
    return summary;
};

const renderMissionTimeline = () => {
    const timeline = ensureMissionTimeline();
    if (!timeline) return;
    timeline.replaceChildren();

    const steps = missionState?.steps || [];
    if (!steps.length) {
        const empty = document.createElement('li');
        empty.className = 'mission-timeline-item';
        empty.textContent = 'Mission will appear after recommendations load.';
        timeline.appendChild(empty);
        return;
    }

    steps.forEach((step) => {
        const item = document.createElement('li');
        item.className = 'mission-timeline-item';
        item.dataset.state = step.status || 'not_started';
        item.dataset.source = step.source || 'plan';
        if (step.id === missionState.currentStepId) {
            item.setAttribute('aria-current', 'step');
        }

        const label = document.createElement('span');
        label.className = 'mission-timeline-label';
        label.textContent = step.label || 'Mission step';

        const meta = document.createElement('span');
        meta.className = 'mission-timeline-meta';
        const stateLabel = step.status === 'complete'
            ? 'Complete'
            : step.status === 'in_progress'
                ? 'In progress'
                : step.source === 'remediation'
                    ? 'Remediation'
                    : 'Queued';
        meta.textContent = stateLabel;

        item.append(label, meta);
        timeline.appendChild(item);
    });
};

const applyGoalStateFromMission = () => {
    const goalList = document.querySelector('#view-coach [data-goal-list]');
    if (!goalList) return;

    const steps = missionState?.steps || [];
    const previousChecked = new Map(
        resolveGoalInputs().map((input) => [input.id, Boolean(input.checked)]),
    );

    goalList.replaceChildren();
    GOAL_SLOT_IDS.forEach((goalId, index) => {
        const step = steps[index] || null;
        const defaults = GOAL_SLOT_DEFAULTS[goalId] || { minutes: 3, label: `Goal ${index + 1}` };
        const item = document.createElement('li');
        item.className = 'game-check-item';
        item.dataset.goalItem = goalId.replace('goal-', '');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = goalId;
        if (step?.id) {
            input.dataset.stepId = step.id;
        } else {
            input.removeAttribute('data-step-id');
        }
        input.checked = step
            ? (step.status || 'not_started') === 'complete'
            : Boolean(previousChecked.get(goalId));

        const label = document.createElement('label');
        label.setAttribute('for', goalId);

        const chip = document.createElement('span');
        chip.className = 'note-chip';
        chip.dataset.goalChip = 'true';
        chip.textContent = `${Math.max(1, Math.round(step?.minutes || defaults.minutes))} min`;

        const text = document.createElement('span');
        text.dataset.goalLabel = 'true';
        text.textContent = step?.label || defaults.label;

        label.append(chip, document.createTextNode(' '), text);
        item.append(input, label);
        goalList.appendChild(item);
    });

    bindGoalInputs();
};

const updateMissionStatus = () => {
    const status = ensureMissionStatus();
    if (!status) return;

    const { completed, total, complete } = missionProgressValues();
    if (complete) {
        status.textContent = `Mission complete: ${completed}/${total} goals done.`;
    } else {
        status.textContent = `Mission progress: ${completed}/${total} goals complete.`;
    }

    const homeSummary = ensureHomeMissionSummary();
    if (homeSummary) {
        const currentStep = missionState?.steps?.find((step) => step.id === missionState?.currentStepId)
            || missionState?.steps?.find((step) => step.status === 'not_started')
            || missionState?.steps?.find((step) => step.status === 'in_progress')
            || null;

        if (complete) {
            homeSummary.textContent = 'Mission complete. Open Wins to celebrate and choose the next mission.';
        } else if (currentStep) {
            homeSummary.textContent = `Next: ${currentStep.label}`;
        } else {
            homeSummary.textContent = 'Mission ready.';
        }
    }

    if (complete && !completionDispatched) {
        completionDispatched = true;
        document.dispatchEvent(new CustomEvent(COACH_MISSION_COMPLETE, {
            detail: {
                completed,
                total,
                missionId: missionState?.id,
                timestamp: Date.now(),
            },
        }));
    }

    if (!complete) {
        completionDispatched = false;
    }
};

const dispatchMissionUpdated = () => {
    document.dispatchEvent(new CustomEvent(MISSION_UPDATED, {
        detail: {
            mission: missionState,
        },
    }));
};

const markGoal = (goalId, { queueIfMissing = true } = {}) => {
    if (!goalId) return false;
    const input = document.getElementById(goalId);
    if (!(input instanceof HTMLInputElement)) {
        if (queueIfMissing) queueGoal(goalId);
        return false;
    }
    if (!input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
};

const flushQueuedGoals = () => {
    const queued = readQueuedGoals();
    if (!queued.length) return;

    const remaining = [];
    queued.forEach((goalId) => {
        const applied = markGoal(goalId, { queueIfMissing: false });
        if (!applied) remaining.push(goalId);
    });
    writeQueuedGoals(remaining);
};

const refreshMissionFromRecommendations = async ({ forceFresh = false } = {}) => {
    const recs = await getLearningRecommendations({ allowCached: !forceFresh });
    weakestSkill = recs?.weakestSkill || weakestSkill;
    missionState = recs?.mission || null;
    missionUnit = missionState?.unitId ? await getCurriculumUnit(missionState.unitId) : null;
    renderMissionTimeline();
    applyGoalStateFromMission();
    updateMissionStatus();
    dispatchMissionUpdated();
};

const updateMissionStep = async ({ stepId, type }) => {
    if (!missionState?.id || !stepId) return;

    const handler = type === 'start' ? startMissionStep : completeMissionStep;
    const result = await handler({
        stepId,
        mission: missionState,
        unit: missionUnit,
    });

    if (result?.mission) {
        missionState = result.mission;
        renderMissionTimeline();
        applyGoalStateFromMission();
        updateMissionStatus();
        dispatchMissionUpdated();
        refreshRecommendationsCache().catch(() => {});
    }
};

const inferGoalFromActivity = (event) => {
    const id = event?.detail?.id;
    if (!id) return null;
    return GOAL_BY_GAME[id] || null;
};

const maybeInsertRemediation = async (event) => {
    const score = Number.isFinite(event?.detail?.accuracy)
        ? event.detail.accuracy
        : event?.detail?.score;

    if (!Number.isFinite(score) || score >= 60) return;
    if (!missionState?.id || !missionUnit) return;

    const result = await insertRemediationForSkill({
        mission: missionState,
        unit: missionUnit,
        skill: weakestSkill || 'pitch',
    });

    if (result?.mission) {
        missionState = result.mission;
        renderMissionTimeline();
        applyGoalStateFromMission();
        updateMissionStatus();
        dispatchMissionUpdated();
        refreshRecommendationsCache().catch(() => {});
    }
};

const bindGoalInputs = () => {
    resolveGoalInputs().forEach((input) => {
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

const handleGoalFromActivity = (goalId) => {
    if (!goalId) return;
    markGoal(goalId);
    updateMissionStatus();
};

const handleLessonStep = async (event) => {
    const stepId = event?.detail?.step?.id;
    const state = event?.detail?.state;
    if (!stepId || !state) return;

    if (state === 'start') {
        await updateMissionStep({ stepId, type: 'start' });
        document.dispatchEvent(new CustomEvent(PRACTICE_STEP_STARTED, {
            detail: {
                missionId: missionState?.id,
                stepId,
                timestamp: Date.now(),
            },
        }));
    }

    if (state === 'complete') {
        await updateMissionStep({ stepId, type: 'complete' });
        document.dispatchEvent(new CustomEvent(PRACTICE_STEP_COMPLETED, {
            detail: {
                missionId: missionState?.id,
                stepId,
                timestamp: Date.now(),
            },
        }));
    }
};

const bindGlobalListeners = () => {
    if (globalsBound) return;
    globalsBound = true;

    document.addEventListener(LESSON_STEP, (event) => {
        handleLessonStep(event).catch(() => {});
    });

    document.addEventListener(LESSON_COMPLETE, () => {
        updateMissionStatus();
    });

    document.addEventListener(GAME_RECORDED, (event) => {
        const goalId = inferGoalFromActivity(event);
        handleGoalFromActivity(goalId);
        maybeInsertRemediation(event).catch(() => {});
    });

    document.addEventListener(SONG_RECORDED, (event) => {
        handleGoalFromActivity('goal-song');
        maybeInsertRemediation(event).catch(() => {});
    });

    document.addEventListener(PRACTICE_RECORDED, (event) => {
        const practiceId = event.detail?.id;
        if (typeof practiceId === 'string' && practiceId.startsWith('goal-step-focus-')) {
            handleGoalFromActivity('goal-warmup');
        }
    });
};

const initMissionProgress = async () => {
    ensureMissionStatus();
    await refreshMissionFromRecommendations({ forceFresh: false });
    bindGoalInputs();
    flushQueuedGoals();
    updateMissionStatus();
    bindGlobalListeners();
};

export const init = initMissionProgress;
