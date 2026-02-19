import { resolveModulesForView } from '../app/module-registry.js';
import { getRouteMeta } from '../views/view-paths.js';

const NAV_GROUP_TO_HREF = {
    practice: '#view-coach',
    games: '#view-games',
    songs: '#view-songs',
};
const NON_CHECKPOINT_VIEWS = new Set(['view-home', 'view-onboarding', 'view-parent']);

export const getViewId = (hash) => {
    const id = (hash || '').replace('#', '').trim();
    return id || 'view-home';
};

export const isPrimaryView = (viewId) => {
    const meta = getRouteMeta(viewId);
    return Boolean(meta?.primaryTask) || meta?.navGroup in NAV_GROUP_TO_HREF;
};

export const getModulesForView = (viewId) => resolveModulesForView(viewId);

export const getActiveNavHref = (viewId) => {
    const meta = getRouteMeta(viewId);
    return NAV_GROUP_TO_HREF[meta?.navGroup] || null;
};

export const isNavItemActive = (itemHref, activeHref) => {
    if (!activeHref) return false;
    return itemHref === activeHref;
};

export const isMissionCheckpointView = (viewId) => {
    if (typeof viewId !== 'string' || !viewId) return false;
    if (NON_CHECKPOINT_VIEWS.has(viewId)) return false;
    const meta = getRouteMeta(viewId);
    if (meta.persona !== 'child') return false;
    return ['practice', 'games', 'songs'].includes(meta.navGroup);
};

export const toMissionCheckpointHref = (viewId) => {
    if (!isMissionCheckpointView(viewId)) return null;
    return `#${viewId}`;
};
