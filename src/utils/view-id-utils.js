const isString = (value) => typeof value === 'string';

export const viewIdMatches = (viewId, { prefixes = [], exact = [] } = {}) => {
    if (!isString(viewId)) return false;
    return prefixes.some((prefix) => viewId.startsWith(prefix)) || exact.includes(viewId);
};

const PRACTICE_VIEW_PREFIXES = Object.freeze(['view-game-', 'view-song-']);
const WAKE_ELIGIBLE_VIEWS = Object.freeze([
    'view-coach',
    'view-songs',
    'view-trainer',
    'view-tuner',
    'view-session-review',
]);
const PRACTICE_VIEWS = Object.freeze([
    'view-coach',
    'view-games',
    'view-songs',
    'view-trainer',
    'view-tuner',
    'view-bowing',
    'view-posture',
]);

export const isWakeEligibleView = (viewId) => viewIdMatches(viewId, {
    prefixes: PRACTICE_VIEW_PREFIXES,
    exact: WAKE_ELIGIBLE_VIEWS,
});

export const isPracticeViewId = (viewId) => viewIdMatches(viewId, {
    prefixes: PRACTICE_VIEW_PREFIXES,
    exact: PRACTICE_VIEWS,
});
