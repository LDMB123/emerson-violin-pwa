/** Maps practice goal/input id prefixes back to canonical game ids. */
export const PRACTICE_GAME_RULES = [
    { test: /^pq-step-/, id: 'pitch-quest' },
    { test: /^rd-set-/, id: 'rhythm-dash' },
    { test: /^nm-card-/, id: 'note-memory' },
    { test: /^et-step-/, id: 'ear-trainer' },
    { test: /^bh-step-/, id: 'bow-hero' },
    { test: /^sq-step-/, id: 'string-quest' },
    { test: /^rp-pattern-/, id: 'rhythm-painter' },
    { test: /^ss-step-/, id: 'story-song' },
    { test: /^pz-step-/, id: 'pizzicato' },
    { test: /^tt-step-/, id: 'tuning-time' },
    { test: /^mm-step-/, id: 'melody-maker' },
    { test: /^sp-step-/, id: 'scale-practice' },
    { test: /^dc-step-/, id: 'duet-challenge' },
    { test: /^ss-step-/, id: 'stir-soup' },
    { test: /^wp-step-/, id: 'wipers' },
    { test: /^dd-step-/, id: 'dynamic-dojo' },
    { test: /^ee-step-/, id: 'echo' },
];

const byDayAscending = (left, right) => left.day - right.day;
const byTimestampAscending = (left, right) => (left.timestamp || 0) - (right.timestamp || 0);

const collectEvents = (events, type, sorter) => events
    .filter((event) => event.type === type)
    .slice()
    .sort(sorter);

const collectPracticeEvents = (events) => collectEvents(events, 'practice', byDayAscending);
const collectGameEvents = (events) => collectEvents(events, 'game', byTimestampAscending);
const collectSongEvents = (events) => collectEvents(events, 'song', byTimestampAscending);

/** Collects the distinct event ids for a given event type. */
export const collectEventIds = (events, type) => new Set(
    events
        .filter((event) => event.type === type)
        .map((event) => event.id),
);

/** Buckets progress events into sorted practice, game, and song collections. */
export const buildProgressEventBuckets = (events) => ({
    practiceEvents: collectPracticeEvents(events),
    gameEvents: collectGameEvents(events),
    songEvents: collectSongEvents(events),
});

/** Creates the seven-day minutes window used by progress charts. */
export const createDailyMinutes = () => Array.from({ length: 7 }, () => 0);

/** Adds minutes into the rolling seven-day window when the day is in range. */
export const addMinutesToDailyWindow = (dailyMinutes, currentDay, day, minutes) => {
    const offset = currentDay - day;
    if (offset < 0 || offset > 6) return false;
    const index = 6 - offset;
    dailyMinutes[index] += minutes;
    return true;
};
