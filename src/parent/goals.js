import { getJSON, setJSON } from '../persistence/storage.js';
import { clamp } from '../utils/math.js';
import { PARENT_GOAL_KEY as GOAL_KEY } from '../persistence/storage-keys.js';
import { GOAL_TARGET_CHANGE } from '../utils/event-names.js';
import { getLearningRecommendations } from '../ml/recommendations.js';

const DEFAULT_GOAL = {
    title: 'Next Recital Piece',
    weeklyMinutes: 90,
};

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

const normalizeGoal = (stored) => {
    const title = typeof stored?.title === 'string' && stored.title.trim()
        ? stored.title.trim()
        : DEFAULT_GOAL.title;

    const minutes = Number.parseInt(stored?.weeklyMinutes ?? DEFAULT_GOAL.weeklyMinutes, 10);
    const weeklyMinutes = Number.isNaN(minutes)
        ? DEFAULT_GOAL.weeklyMinutes
        : clamp(minutes, 30, 420);

    return { title, weeklyMinutes };
};

const loadGoal = async () => {
    const stored = await getJSON(GOAL_KEY);
    return normalizeGoal(stored);
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

    const title = titleInput?.value?.trim() || DEFAULT_GOAL.title;
    const minutesRaw = minutesInput?.value || DEFAULT_GOAL.weeklyMinutes;
    const minutes = Number.parseInt(minutesRaw, 10);

    if (Number.isNaN(minutes)) {
        setStatus('Enter a weekly goal between 30 and 420 minutes.');
        return;
    }

    const goal = {
        title,
        weeklyMinutes: clamp(minutes, 30, 420),
    };

    setFormDisabled(true);
    setStatus('Saving goal…');

    await setJSON(GOAL_KEY, goal);
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
            loadGoal(),
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
