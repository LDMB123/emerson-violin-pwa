import { GOAL_TARGET_CHANGE } from '../utils/event-names.js';
import { getLearningRecommendations } from '../ml/recommendations.js';
import {
    loadParentGoal,
    parseParentGoalInput,
    saveParentGoal,
} from './parent-goals-model.js';

let titleEl = null;
let titleInput = null;
let minutesInput = null;
let saveButton = null;
let statusEl = null;
let rationaleEl = null;
let initGeneration = 0;

const resolveElements = () => {
    titleEl = document.querySelector('[data-parent-goal-title]');
    titleInput = document.querySelector('[data-parent-goal-title-input]');
    minutesInput = document.querySelector('[data-parent-goal-minutes-input]');
    saveButton = document.querySelector('[data-parent-goal-save]');
    statusEl = document.querySelector('[data-parent-goal-status]');
    rationaleEl = document.querySelector('[data-parent-goal-rationale]');
};

const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const setFormDisabled = (disabled) => {
    if (titleInput) titleInput.disabled = disabled;
    if (minutesInput) minutesInput.disabled = disabled;
    if (saveButton) saveButton.disabled = disabled;
};

const applyWeeklyTarget = (value) => {
    document.documentElement.dataset.weeklyGoalTarget = String(value);
};

const renderGoal = (goal) => {
    if (titleEl) titleEl.textContent = goal.title;
    if (titleInput) titleInput.value = goal.title;
    if (minutesInput) minutesInput.value = String(goal.weeklyMinutes);
    applyWeeklyTarget(goal.weeklyMinutes);
};

const renderGoalRationale = (recs) => {
    if (!rationaleEl) return;
    const action = Array.isArray(recs?.nextActions) ? recs.nextActions[0] : null;
    if (action?.rationale) {
        rationaleEl.textContent = `Coach rationale: ${action.rationale}`;
        return;
    }
    const skill = recs?.skillLabel || recs?.weakestSkill;
    if (skill) {
        rationaleEl.textContent = `Current focus: ${skill}. Set a weekly minutes goal that supports this focus.`;
        return;
    }
    rationaleEl.textContent = 'Goal suggestions load from current mission focus.';
};

const saveGoal = async () => {
    resolveElements();
    if (!saveButton) return;

    const { goal, error } = parseParentGoalInput({
        titleInput: titleInput?.value,
        minutesInput: minutesInput?.value,
    });
    if (error || !goal) {
        setStatus(error || 'Unable to save goal. Try again.');
        return;
    }

    setFormDisabled(true);
    setStatus('Saving goal…');

    await saveParentGoal(goal);
    renderGoal(goal);
    setStatus('Goal saved.');
    document.dispatchEvent(new CustomEvent(GOAL_TARGET_CHANGE, {
        detail: { weeklyMinutes: goal.weeklyMinutes, title: goal.title },
    }));
    setFormDisabled(false);
};

const bindLocalListeners = () => {
    if (titleInput) {
        titleInput.dataset.parentGoalBound = 'true';
        titleInput.oninput = () => setStatus('Unsaved changes.');
    }

    if (minutesInput) {
        minutesInput.dataset.parentGoalBound = 'true';
        minutesInput.oninput = () => setStatus('Unsaved changes.');
    }

    if (saveButton) {
        saveButton.dataset.parentGoalBound = 'true';
        saveButton.onclick = () => {
            saveGoal().catch(() => {
                setStatus('Unable to save goal. Try again.');
                setFormDisabled(false);
            });
        };
    }
};

const initParentGoals = async () => {
    const generation = ++initGeneration;
    resolveElements();
    if (!saveButton) return;

    bindLocalListeners();
    setFormDisabled(true);
    setStatus('Loading goal…');

    try {
        const [goal, recs] = await Promise.all([
            loadParentGoal(),
            getLearningRecommendations().catch(() => null),
        ]);
        if (generation !== initGeneration) return;
        renderGoal(goal);
        renderGoalRationale(recs);
        setStatus('Goal ready.');
    } catch {
        if (generation !== initGeneration) return;
        setStatus('Unable to load goal. Try again.');
    } finally {
        if (generation !== initGeneration) return;
        setFormDisabled(false);
    }
};

export const init = initParentGoals;
