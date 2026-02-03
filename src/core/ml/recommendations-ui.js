import { getLearningRecommendations } from './recommendations.js';
import { cloneTemplate } from '@core/utils/templates.js';

const panels = Array.from(document.querySelectorAll('[data-lesson-plan]'));
const stepLists = Array.from(document.querySelectorAll('[data-lesson-steps]'));
const goalList = document.querySelector('[data-goal-list]');
const stepTemplate = document.querySelector('#lesson-step-template');

const SKILL_LABELS = {
    pitch: 'Pitch',
    rhythm: 'Rhythm',
    bow_control: 'Bowing',
    reading: 'Reading',
    posture: 'Posture',
    focus: 'Focus',
};

const formatBpm = (value) => `${Math.round(value)} BPM`;
const formatMinutes = (value) => `${Math.max(0, Math.round(value || 0))} min`;

const toLessonLink = (id) => {
    if (!id) return '#view-games';
    if (id.startsWith('view-')) return `#${id}`;
    return `#view-game-${id}`;
};

const updatePanel = (panel, recs) => {
    if (!panel || !recs) return;
    const skillEl = panel.querySelector('[data-lesson="skill"]');
    const gameEl = panel.querySelector('[data-lesson="game"]');
    const bpmEl = panel.querySelector('[data-lesson="bpm"]');
    const totalEl = panel.querySelector('[data-lesson="total"]');
    const ctaEl = panel.querySelector('[data-lesson="cta"]');
    const metronomeBtn = panel.querySelector('[data-lesson-metronome]');

    const skillLabel = recs.skillLabel || SKILL_LABELS[recs.weakestSkill] || 'Pitch';
    if (skillEl) skillEl.textContent = skillLabel;
    if (gameEl) gameEl.textContent = recs.recommendedGameLabel || 'Pitch Quest';
    const metronomeTarget = Math.round(recs.metronomeTarget || 90);
    if (bpmEl) bpmEl.textContent = formatBpm(metronomeTarget);
    if (totalEl) totalEl.textContent = formatMinutes(recs.lessonTotal || 15);

    if (ctaEl) {
        ctaEl.setAttribute('href', toLessonLink(recs.recommendedGameId));
        ctaEl.textContent = panel.dataset.lessonPlan === 'progress'
            ? `Start ${recs.recommendedGameLabel || 'practice'}`
            : `Start ${recs.recommendedGameLabel || 'practice'}`;
    }

    if (metronomeBtn) {
        metronomeBtn.dataset.metronomeBpm = String(metronomeTarget);
        metronomeBtn.setAttribute('aria-label', `Set metronome to ${metronomeTarget} BPM`);
    }
};

const renderSteps = (container, steps = []) => {
    if (!container) return;
    container.replaceChildren();
    if (!stepTemplate) return;
    const fragment = document.createDocumentFragment();
    steps.forEach((step) => {
        const item = cloneTemplate(stepTemplate);
        if (!item) return;
        const time = item.querySelector('[data-lesson-step-time]');
        if (time) time.textContent = formatMinutes(step.minutes || 0);
        const text = item.querySelector('[data-lesson-step-text]');
        if (text) text.textContent = step.label || 'Practice step';
        const link = item.querySelector('[data-lesson-step-link]');
        if (link) {
            if (step.cta) {
                link.textContent = step.ctaLabel || 'Open';
                link.setAttribute('href', toLessonLink(step.cta));
                link.removeAttribute('data-empty');
            } else {
                link.removeAttribute('href');
                link.textContent = '';
                link.setAttribute('data-empty', 'true');
            }
        }
        const cue = item.querySelector('[data-lesson-step-cue]');
        if (cue) {
            cue.textContent = step.cue || '';
            cue.toggleAttribute('data-empty', !step.cue);
        }
        fragment.appendChild(item);
    });
    container.appendChild(fragment);
};

const setDailyGoalTarget = (total) => {
    const value = Math.max(5, Math.round(total || 15));
    const root = document.documentElement;
    if (root) root.dataset.dailyGoalTarget = String(value);
    const targetEl = document.querySelector('[data-progress="daily-goal-value"]');
    if (targetEl) targetEl.textContent = String(value);
    document.dispatchEvent(new CustomEvent('panda:goal-target-change', { detail: { value } }));
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

document.addEventListener('panda:ml-update', refreshPanels);
document.addEventListener('panda:ml-reset', refreshPanels);
document.addEventListener('panda:ml-recs', refreshPanels);
