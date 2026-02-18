import { getLearningRecommendations } from './recommendations.js';
import { SKILL_LABELS } from '../utils/recommendations-utils.js';
import { toLessonLink } from '../utils/lesson-plan-utils.js';
import { GOAL_TARGET_CHANGE, ML_UPDATE, ML_RESET, ML_RECS } from '../utils/event-names.js';

const panels = Array.from(document.querySelectorAll('[data-lesson-plan]'));
const stepLists = Array.from(document.querySelectorAll('[data-lesson-steps]'));
const goalList = document.querySelector('[data-goal-list]');

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
    if (totalEl) totalEl.textContent = formatMinutes(recs.lessonTotal || 15);

    if (ctaEl) {
        ctaEl.setAttribute('href', toLessonLink(recs.recommendedGameId));
        ctaEl.textContent = `Start ${recs.recommendedGameLabel || 'practice'}`;
    }
};

const renderSteps = (container, steps = []) => {
    if (!container) return;
    container.innerHTML = '';
    steps.forEach((step) => {
        const item = document.createElement('li');
        item.className = 'lesson-step';

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
    if (Array.isArray(recs?.lessonSteps)) {
        stepLists.forEach((list) => renderSteps(list, recs.lessonSteps));
        updateGoals(recs.lessonSteps);
    }
    if (recs?.lessonTotal) {
        setDailyGoalTarget(recs.lessonTotal);
    }
};

refreshPanels();

document.addEventListener(ML_UPDATE, refreshPanels);
document.addEventListener(ML_RESET, refreshPanels);
document.addEventListener(ML_RECS, refreshPanels);
