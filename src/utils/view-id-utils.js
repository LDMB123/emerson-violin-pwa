const isString = (value) => typeof value === 'string';

/**
 * Checks whether a view id matches one of the supplied prefixes or exact ids.
 *
 * @param {string} viewId
 * @param {Object} [options={}]
 * @param {string[]} [options.prefixes=[]]
 * @param {string[]} [options.exact=[]]
 * @returns {boolean}
 */
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

/**
 * Returns whether a view can request wake-related power settings.
 *
 * @param {string} viewId
 * @returns {boolean}
 */
export const isWakeEligibleView = (viewId) => viewIdMatches(viewId, {
    prefixes: PRACTICE_VIEW_PREFIXES,
    exact: WAKE_ELIGIBLE_VIEWS,
});

/**
 * Returns whether a view counts as a practice-facing route.
 *
 * @param {string} viewId
 * @returns {boolean}
 */
export const isPracticeViewId = (viewId) => viewIdMatches(viewId, {
    prefixes: PRACTICE_VIEW_PREFIXES,
    exact: PRACTICE_VIEWS,
});
