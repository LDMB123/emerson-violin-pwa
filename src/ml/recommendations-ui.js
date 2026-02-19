import { getLearningRecommendations } from './recommendations.js';
import { SKILL_LABELS } from '../utils/recommendations-utils.js';
import { toLessonLink } from '../utils/lesson-plan-utils.js';
import {
    GOAL_TARGET_CHANGE,
    MISSION_UPDATED,
    ML_UPDATE,
    ML_RESET,
    ML_RECS,
} from '../utils/event-names.js';

let panels = [];
let stepLists = [];
let goalList = null;
let globalsBound = false;

const resolveElements = () => {
    panels = Array.from(document.querySelectorAll('[data-lesson-plan]'));
    stepLists = Array.from(document.querySelectorAll('[data-lesson-steps]'));
    goalList = document.querySelector('[data-goal-list]');
};

const formatBpm = (value) => `${Math.round(value)} BPM`;
const formatMinutes = (value) => `${Math.max(0, Math.round(value || 0))} min`;

const updatePanel = (panel, recs) => {
    if (!panel || !recs) return;
    const skillEl = panel.querySelector('[data-lesson="skill"]');
    const gameEl = panel.querySelector('[data-lesson="game"]');
    const bpmEl = panel.querySelector('[data-lesson="bpm"]');
    const totalEl = panel.querySelector('[data-lesson="total"]');
    const ctaEl = panel.querySelector('[data-lesson="cta"]');

    const skillLabel = recs.skillLabel || SKILL_LABELS[recs.weakestSkill] || 'Pitch';
    if (skillEl) skillEl.textContent = skillLabel;
    if (gameEl) gameEl.textContent = recs.recommendedGameLabel || 'Pitch Quest';
    if (bpmEl) bpmEl.textContent = formatBpm(recs.metronomeTarget || 90);
    const missionTotal = Array.isArray(recs?.mission?.steps)
        ? recs.mission.steps.reduce((sum, step) => sum + Math.max(1, Math.round(step.minutes || 3)), 0)
        : 0;
    if (totalEl) totalEl.textContent = formatMinutes(missionTotal || recs.lessonTotal || 15);

    if (ctaEl) {
        const currentStep = Array.isArray(recs?.mission?.steps)
            ? recs.mission.steps.find((step) => step.id === recs?.mission?.currentStepId)
            : null;
        const stepTarget = currentStep?.target || currentStep?.cta;
        ctaEl.setAttribute('href', toLessonLink(stepTarget || recs.recommendedGameId));
        ctaEl.textContent = currentStep?.label
            ? `Resume ${currentStep.label}`
            : `Start ${recs.recommendedGameLabel || 'practice'}`;
    }
};

const renderSteps = (container, steps = []) => {
    if (!container) return;
    container.innerHTML = '';
    steps.forEach((step) => {
        const item = document.createElement('li');
        item.className = 'lesson-step';
        if (step?.status === 'complete') item.classList.add('is-complete');
        if (step?.status === 'in_progress') item.classList.add('is-active');
        if (step?.source === 'remediation') item.classList.add('is-remediation');

        const time = document.createElement('span');
        time.className = 'lesson-step-time';
        time.textContent = formatMinutes(step.minutes || 0);

        const text = document.createElement('span');
        text.className = 'lesson-step-text';
        text.textContent = step.label || 'Practice step';

        item.appendChild(time);
        item.appendChild(text);

        if (step.cta) {
            const link = document.createElement('a');
            link.className = 'lesson-step-link';
            link.textContent = step.ctaLabel || 'Open';
            link.setAttribute('href', toLessonLink(step.cta));
            item.appendChild(link);
        }

        if (step.cue) {
            const cue = document.createElement('span');
            cue.className = 'lesson-step-cue';
            cue.textContent = step.cue;
            item.appendChild(cue);
        }

        container.appendChild(item);
    });
};

const setDailyGoalTarget = (total) => {
    const value = Math.max(5, Math.round(total || 15));
    document.documentElement.dataset.dailyGoalTarget = String(value);
    const targetEl = document.querySelector('[data-progress="daily-goal-value"]');
    if (targetEl) targetEl.textContent = String(value);
    document.dispatchEvent(new CustomEvent(GOAL_TARGET_CHANGE, { detail: { value } }));
};

const updateGoals = (steps = []) => {
    if (!goalList || !steps.length) return;
    steps.forEach((step) => {
        if (!step.id) return;
        const input = document.getElementById(step.id);
        if (!input) return;
        input.dataset.minutes = String(step.minutes || 0);
        const label = goalList.querySelector(`label[for="${step.id}"]`);
        if (!label) return;
        const chip = label.querySelector('[data-goal-chip]') || label.querySelector('.note-chip');
        if (chip) chip.textContent = formatMinutes(step.minutes || 0);
        const text = label.querySelector('[data-goal-label]');
        if (text) text.textContent = step.label || '';
    });
};

const refreshPanels = async () => {
    if (!panels.length) return;
    const recs = await getLearningRecommendations();
    panels.forEach((panel) => updatePanel(panel, recs));
    const missionSteps = Array.isArray(recs?.mission?.steps) && recs.mission.steps.length
        ? recs.mission.steps
        : recs?.lessonSteps;
    if (Array.isArray(missionSteps)) {
        stepLists.forEach((list) => renderSteps(list, missionSteps));
        updateGoals(missionSteps);
    }
    const total = Array.isArray(missionSteps)
        ? missionSteps.reduce((sum, step) => sum + Math.max(1, Math.round(step.minutes || 3)), 0)
        : recs?.lessonTotal;
    if (total) {
        setDailyGoalTarget(total);
    }
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
