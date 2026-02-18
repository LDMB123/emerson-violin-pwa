import { resolveModulesForView } from '../app/module-registry.js';

export const PRIMARY_VIEWS = new Set(['view-home', 'view-coach', 'view-games', 'view-progress']);

export const getViewId = (hash) => {
    const id = (hash || '').replace('#', '').trim();
    return id || 'view-home';
};

export const isPrimaryView = (viewId) => {
    return PRIMARY_VIEWS.has(viewId);
};

export const getModulesForView = (viewId) => resolveModulesForView(viewId);

export const getActiveNavHref = (viewId) => {
    return isPrimaryView(viewId) ? `#${viewId}` : null;
};

export const isNavItemActive = (itemHref, activeHref) => {
    if (!activeHref) return false;
    return itemHref === activeHref;
};
