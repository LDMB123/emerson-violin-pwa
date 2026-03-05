import { getRouteMeta } from '../views/view-paths.js';

const NAV_GROUP_TO_HREF = {
    practice: '#view-coach',
    games: '#view-games',
    songs: '#view-songs',
};
const NON_CHECKPOINT_VIEWS = new Set(['view-home', 'view-onboarding', 'view-parent']);

/**
 * Normalizes a location hash into a view id.
 *
 * @param {string | null | undefined} hash
 * @returns {string}
 */
export const getViewId = (hash) => {
    const id = (hash || '').replace('#', '').trim();
    return id || 'view-home';
};

/**
 * Resolves the primary nav href for a view.
 *
 * @param {string} viewId
 * @returns {string | null}
 */
export const getActiveNavHref = (viewId) => {
    const meta = getRouteMeta(viewId);
    return NAV_GROUP_TO_HREF[meta?.navGroup] || null;
};

/**
 * Checks whether a nav item matches the active nav target.
 *
 * @param {string | null | undefined} itemHref
 * @param {string | null | undefined} activeHref
 * @returns {boolean}
 */
export const isNavItemActive = (itemHref, activeHref) => {
    if (!activeHref) return false;
    return itemHref === activeHref;
};

/**
 * Determines whether a view should be treated as a checkpoint-eligible child
 * route.
 *
 * @param {string | null | undefined} viewId
 * @returns {boolean}
 */
export const isMissionCheckpointView = (viewId) => {
    if (typeof viewId !== 'string' || !viewId) return false;
    if (NON_CHECKPOINT_VIEWS.has(viewId)) return false;
    const meta = getRouteMeta(viewId);
    if (meta.persona !== 'child') return false;
    return ['practice', 'games', 'songs'].includes(meta.navGroup);
};

/**
 * Builds a checkpoint href for a child route, or null when the route does not
 * qualify.
 *
 * @param {string | null | undefined} viewId
 * @returns {string | null}
 */
export const toMissionCheckpointHref = (viewId) => {
    if (!isMissionCheckpointView(viewId)) return null;
    return `#${viewId}`;
};
