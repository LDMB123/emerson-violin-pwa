import { SKILL_LABELS } from '../utils/recommendations-utils.js';
import { toLessonLink } from '../utils/lesson-plan-utils.js';

const formatBpm = (value) => `${Math.round(value)} BPM`;

export const formatMinutes = (value) => `${Math.max(0, Math.round(value || 0))} min`;

const sumStepMinutes = (steps = []) => (
    steps.reduce((sum, step) => sum + Math.max(1, Math.round(step?.minutes || 3)), 0)
);

const getCurrentMissionStep = (recs) => {
    if (!Array.isArray(recs?.mission?.steps)) return null;
    return recs.mission.steps.find((step) => step.id === recs?.mission?.currentStepId) || null;
};

export const resolveMissionSteps = (recs) => {
    if (Array.isArray(recs?.mission?.steps) && recs.mission.steps.length) {
        return recs.mission.steps;
    }
    if (Array.isArray(recs?.lessonSteps)) {
        return recs.lessonSteps;
    }
    return [];
};

export const resolveTotalMinutes = (recs, missionSteps = []) => {
    if (Array.isArray(missionSteps) && missionSteps.length) {
        return sumStepMinutes(missionSteps);
    }
    return recs?.lessonTotal || 0;
};

export const updateLessonPanel = (panel, recs) => {
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

    const missionSteps = Array.isArray(recs?.mission?.steps) ? recs.mission.steps : [];
    const missionTotal = missionSteps.length ? sumStepMinutes(missionSteps) : 0;
    if (totalEl) totalEl.textContent = formatMinutes(missionTotal || recs.lessonTotal || 15);

    if (!ctaEl) return;
    const currentStep = getCurrentMissionStep(recs);
    const stepTarget = currentStep?.target || currentStep?.cta;
    ctaEl.setAttribute('href', toLessonLink(stepTarget || recs.recommendedGameId));
    ctaEl.textContent = currentStep?.label
        ? `Resume ${currentStep.label}`
        : `Start ${recs.recommendedGameLabel || 'practice'}`;
};

export const renderLessonSteps = (container, steps = []) => {
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

export const updateGoalInputs = (goalList, steps = []) => {
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
