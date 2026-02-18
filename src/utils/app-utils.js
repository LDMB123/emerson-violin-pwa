export const PRIMARY_VIEWS = new Set(['view-home', 'view-coach', 'view-games', 'view-progress']);

export const getViewId = (hash) => {
    const id = (hash || '').replace('#', '').trim();
    return id || 'view-home';
};

export const isPrimaryView = (viewId) => {
    return PRIMARY_VIEWS.has(viewId);
};

export const getModulesForView = (viewId) => {
    const modules = [];

    if (viewId === 'view-tuner') {
        modules.push('tuner');
    }

    if (viewId === 'view-session-review' || viewId === 'view-analysis') {
        modules.push('sessionReview', 'recordings');
    }

    if (viewId === 'view-songs' || viewId.startsWith('view-song-')) {
        modules.push('songProgress', 'songSearch', 'recordings');
    }

    if (viewId === 'view-coach') {
        modules.push('coachActions', 'focusTimer', 'lessonPlan', 'recommendationsUi');
    }

    if (viewId === 'view-trainer' || viewId === 'view-bowing' || viewId === 'view-posture') {
        modules.push('trainerTools');
    }

    if (viewId === 'view-settings') {
        modules.push('swUpdates', 'adaptiveUi', 'offlineMode', 'reminders');
    }

    if (viewId === 'view-backup') {
        modules.push('backupExport');
    }

    if (viewId === 'view-parent') {
        modules.push('parentPin', 'parentGoals', 'parentRecordings', 'reminders');
    }

    if (viewId === 'view-games' || viewId.startsWith('view-game-')) {
        modules.push('gameMetrics', 'gameEnhancements', 'gameComplete');
    }

    if (viewId === 'view-progress') {
        modules.push('recommendationsUi');
    }

    return modules;
};

export const getActiveNavHref = (viewId) => {
    return isPrimaryView(viewId) ? `#${viewId}` : null;
};

export const isNavItemActive = (itemHref, activeHref) => {
    if (!activeHref) return false;
    return itemHref === activeHref;
};
