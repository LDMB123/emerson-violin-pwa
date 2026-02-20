const AUTO_GOALS_KEY = 'panda-violin:coach-auto-goals:v1';

export const GOAL_BY_GAME = Object.freeze({
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

export const GOAL_SLOT_IDS = Object.freeze(['goal-warmup', 'goal-scale', 'goal-rhythm', 'goal-ear', 'goal-song']);

export const GOAL_SLOT_DEFAULTS = Object.freeze({
    'goal-warmup': { minutes: 3, label: 'Warm-up open strings' },
    'goal-scale': { minutes: 4, label: 'Slow scale focus' },
    'goal-rhythm': { minutes: 3, label: 'Metronome rhythm drill' },
    'goal-ear': { minutes: 2, label: 'Match pitches by ear' },
    'goal-song': { minutes: 3, label: 'Play one song slowly' },
});

export const readQueuedGoals = (storage = window.localStorage) => {
    try {
        const stored = JSON.parse(storage.getItem(AUTO_GOALS_KEY) || '[]');
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

export const writeQueuedGoals = (goals, storage = window.localStorage) => {
    try {
        storage.setItem(AUTO_GOALS_KEY, JSON.stringify(goals));
    } catch {
        // Ignore local storage write failures.
    }
};

export const queueGoal = (goalId, storage = window.localStorage) => {
    if (!goalId) return;
    const queued = readQueuedGoals(storage);
    if (queued.includes(goalId)) return;
    queued.push(goalId);
    writeQueuedGoals(queued, storage);
};

export const inferGoalFromActivity = (event) => {
    const id = event?.detail?.id;
    if (!id) return null;
    return GOAL_BY_GAME[id] || null;
};
