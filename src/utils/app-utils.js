export const PRIMARY_VIEWS = new Set(['view-home', 'view-coach', 'view-games', 'view-progress']);

export const getViewId = (hash) => {
    const id = (hash || '').replace('#', '').trim();
    return id || 'view-home';
};

export const isPrimaryView = (viewId) => {
    return PRIMARY_VIEWS.has(viewId);
};

const equals = (...targets) => (viewId) => targets.includes(viewId);
const startsWith = (prefix) => (viewId) => viewId.startsWith(prefix);
const oneOf = (...checks) => (viewId) => checks.some((check) => check(viewId));

const MODULE_RULES = [
    { when: equals('view-tuner'), modules: ['tuner'] },
    { when: equals('view-session-review', 'view-analysis'), modules: ['sessionReview', 'recordings'] },
    { when: oneOf(equals('view-songs'), startsWith('view-song-')), modules: ['songProgress', 'songSearch', 'recordings'] },
    { when: equals('view-coach'), modules: ['coachActions', 'focusTimer', 'lessonPlan', 'recommendationsUi'] },
    { when: equals('view-trainer', 'view-bowing', 'view-posture'), modules: ['trainerTools'] },
    { when: equals('view-settings'), modules: ['swUpdates', 'adaptiveUi', 'offlineMode', 'reminders'] },
    { when: equals('view-backup'), modules: ['backupExport'] },
    { when: equals('view-parent'), modules: ['parentPin', 'parentGoals', 'parentRecordings', 'reminders'] },
    { when: oneOf(equals('view-games'), startsWith('view-game-')), modules: ['gameMetrics', 'gameEnhancements', 'gameComplete'] },
    { when: equals('view-progress'), modules: ['recommendationsUi'] },
];

const modulesByView = new Map();

export const getModulesForView = (viewId) => {
    if (typeof viewId !== 'string' || !viewId) {
        return [];
    }
    if (modulesByView.has(viewId)) {
        return modulesByView.get(viewId);
    }

    const modules = [];
    MODULE_RULES.forEach(({ when, modules: ruleModules }) => {
        if (!when(viewId)) return;
        ruleModules.forEach((module) => {
            if (!modules.includes(module)) {
                modules.push(module);
            }
        });
    });

    const resolvedModules = Object.freeze(modules);
    modulesByView.set(viewId, resolvedModules);
    return resolvedModules;
};

export const getActiveNavHref = (viewId) => {
    return isPrimaryView(viewId) ? `#${viewId}` : null;
};

export const isNavItemActive = (itemHref, activeHref) => {
    if (!activeHref) return false;
    return itemHref === activeHref;
};
