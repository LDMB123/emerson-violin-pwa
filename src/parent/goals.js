import { getJSON, setJSON } from '../persistence/storage.js';
import { clamp } from '../utils/math.js';

const GOAL_KEY = 'panda-violin:parent-goal-v1';
const DEFAULT_GOAL = {
    title: 'Next Recital Piece',
    weeklyMinutes: 90,
};

const titleEl = document.querySelector('[data-parent-goal-title]');
const titleInput = document.querySelector('[data-parent-goal-title-input]');
const minutesInput = document.querySelector('[data-parent-goal-minutes-input]');
const saveButton = document.querySelector('[data-parent-goal-save]');
const statusEl = document.querySelector('[data-parent-goal-status]');

const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const applyWeeklyTarget = (value) => {
    if (document.documentElement) {
        document.documentElement.dataset.weeklyGoalTarget = String(value);
    }
    document.dispatchEvent(new CustomEvent('panda:weekly-goal-change', { detail: { value } }));
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

const saveGoal = async () => {
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
    await setJSON(GOAL_KEY, goal);
    renderGoal(goal);
    setStatus('Goal saved.');
};

const init = async () => {
    const goal = await loadGoal();
    renderGoal(goal);
    setStatus('Goal saved.');

    titleInput?.addEventListener('input', () => setStatus('Unsaved changes.'));
    minutesInput?.addEventListener('input', () => setStatus('Unsaved changes.'));
    saveButton?.addEventListener('click', saveGoal);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
