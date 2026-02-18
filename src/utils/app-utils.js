export const PRIMARY_VIEWS = new Set(['view-home', 'view-coach', 'view-games', 'view-progress']);

export const getViewId = (hash) => {
    const id = (hash || '').replace('#', '').trim();
    return id || 'view-home';
};

export const isPrimaryView = (viewId) => {
    return PRIMARY_VIEWS.has(viewId);
};

export const normalizeViewHash = (viewId) => {
    if (!viewId) return '#view-home';
    if (viewId.startsWith('#')) return viewId;
    return `#${viewId}`;
};

export const isViewHash = (href) => {
    if (!href) return false;
    return href.startsWith('#view-');
};

export const shouldLoadTuner = (viewId) => viewId === 'view-tuner';
export const shouldLoadSessionReview = (viewId) => viewId === 'view-session-review' || viewId === 'view-analysis';
export const shouldLoadSongs = (viewId) => viewId === 'view-songs' || viewId.startsWith('view-song-');
export const shouldLoadCoach = (viewId) => viewId === 'view-coach';
export const shouldLoadTrainer = (viewId) => viewId === 'view-trainer' || viewId === 'view-bowing' || viewId === 'view-posture';
export const shouldLoadSettings = (viewId) => viewId === 'view-settings';
export const shouldLoadBackup = (viewId) => viewId === 'view-backup';
export const shouldLoadParent = (viewId) => viewId === 'view-parent';
export const shouldLoadGames = (viewId) => viewId === 'view-games' || viewId.startsWith('view-game-');
export const shouldLoadProgress = (viewId) => viewId === 'view-progress';

export const getModulesForView = (viewId) => {
    const modules = [];

    if (shouldLoadTuner(viewId)) {
        modules.push('tuner');
    }

    if (shouldLoadSessionReview(viewId)) {
        modules.push('sessionReview', 'recordings');
    }

    if (shouldLoadSongs(viewId)) {
        modules.push('songProgress', 'songSearch', 'recordings');
    }

    if (shouldLoadCoach(viewId)) {
        modules.push('coachActions', 'focusTimer', 'lessonPlan', 'recommendationsUi');
    }

    if (shouldLoadTrainer(viewId)) {
        modules.push('trainerTools');
    }

    if (shouldLoadSettings(viewId)) {
        modules.push('swUpdates', 'adaptiveUi', 'offlineMode', 'reminders');
    }

    if (shouldLoadBackup(viewId)) {
        modules.push('backupExport');
    }

    if (shouldLoadParent(viewId)) {
        modules.push('parentPin', 'parentGoals', 'parentRecordings', 'reminders');
    }

    if (shouldLoadGames(viewId)) {
        modules.push('gameMetrics', 'gameEnhancements', 'gameComplete');
    }

    if (shouldLoadProgress(viewId)) {
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
