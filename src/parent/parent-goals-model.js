import { getJSON, setJSON } from '../persistence/storage.js';
import { clamp } from '../utils/math.js';
import { PARENT_GOAL_KEY as GOAL_KEY } from '../persistence/storage-keys.js';

const MIN_WEEKLY_MINUTES = 30;
const MAX_WEEKLY_MINUTES = 420;

export const DEFAULT_PARENT_GOAL = {
    title: 'Next Recital Piece',
    weeklyMinutes: 90,
};

export const normalizeParentGoal = (stored) => {
    const title = typeof stored?.title === 'string' && stored.title.trim()
        ? stored.title.trim()
        : DEFAULT_PARENT_GOAL.title;

    const minutes = Number.parseInt(stored?.weeklyMinutes ?? DEFAULT_PARENT_GOAL.weeklyMinutes, 10);
    const weeklyMinutes = Number.isNaN(minutes)
        ? DEFAULT_PARENT_GOAL.weeklyMinutes
        : clamp(minutes, MIN_WEEKLY_MINUTES, MAX_WEEKLY_MINUTES);

    return { title, weeklyMinutes };
};

export const parseParentGoalInput = ({ titleInput, minutesInput }) => {
    const title = titleInput?.trim() || DEFAULT_PARENT_GOAL.title;
    const parsed = Number.parseInt(minutesInput ?? DEFAULT_PARENT_GOAL.weeklyMinutes, 10);

    if (Number.isNaN(parsed)) {
        return {
            goal: null,
            error: `Enter a weekly goal between ${MIN_WEEKLY_MINUTES} and ${MAX_WEEKLY_MINUTES} minutes.`,
        };
    }

    return {
        goal: {
            title,
            weeklyMinutes: clamp(parsed, MIN_WEEKLY_MINUTES, MAX_WEEKLY_MINUTES),
        },
        error: null,
    };
};

export const loadParentGoal = async () => {
    const stored = await getJSON(GOAL_KEY);
    return normalizeParentGoal(stored);
};

export const saveParentGoal = async (goal) => {
    await setJSON(GOAL_KEY, goal);
};
