const FEATURES = [
    {
        id: 'platform',
        path: '../platform/native-apis.js',
        loader: () => import('../platform/native-apis.js'),
        eager: true,
    },
    {
        id: 'installGuide',
        path: '../platform/install-guide.js',
        loader: () => import('../platform/install-guide.js'),
        idle: true,
    },
    {
        id: 'ipadosCapabilities',
        path: '../platform/ipados-capabilities.js',
        loader: () => import('../platform/ipados-capabilities.js'),
        eager: true,
    },
    {
        id: 'capabilityRegistry',
        path: '../platform/capability-registry.js',
        loader: () => import('../platform/capability-registry.js'),
        idle: true,
    },
    {
        id: 'performanceMode',
        path: '../platform/performance-mode.js',
        loader: () => import('../platform/performance-mode.js'),
        eager: true,
    },
    {
        id: 'perfTelemetry',
        path: '../platform/perf-telemetry.js',
        loader: () => import('../platform/perf-telemetry.js'),
        eager: true,
    },
    {
        id: 'mlScheduler',
        path: '../ml/offline-scheduler.js',
        loader: () => import('../ml/offline-scheduler.js'),
        idle: true,
    },
    {
        id: 'mlBackend',
        path: '../ml/backend-manager.js',
        loader: () => import('../ml/backend-manager.js'),
        idle: true,
    },
    {
        id: 'mlInference',
        path: '../ml/inference.js',
        loader: () => import('../ml/inference.js'),
        idle: true,
    },
    {
        id: 'offlineIntegrity',
        path: '../platform/offline-integrity.js',
        loader: () => import('../platform/offline-integrity.js'),
        idle: true,
    },
    {
        id: 'offlineMode',
        path: '../platform/offline-mode.js',
        loader: () => import('../platform/offline-mode.js'),
        idle: true,
    },
    {
        id: 'lessonPacks',
        path: '../platform/lesson-packs.js',
        loader: () => import('../platform/lesson-packs.js'),
        idle: true,
    },
    {
        id: 'progress',
        path: '../../features/progress/progress.js',
        loader: () => import('../../features/progress/progress.js'),
        eager: true,
    },
    {
        id: 'persist',
        path: '../persistence/persist.js',
        loader: () => import('../persistence/persist.js'),
        eager: true,
    },
    {
        id: 'tuner',
        path: '../../features/tuner/tuner.js',
        loader: () => import('../../features/tuner/tuner.js'),
        views: ['view-tuner'],
    },
    {
        id: 'songSearch',
        path: '../../features/songs/song-search.js',
        loader: () => import('../../features/songs/song-search.js'),
        views: ['view-songs'],
        viewPrefixes: ['view-song-'],
    },
    {
        id: 'songProgress',
        path: '../../features/songs/song-progress.js',
        loader: () => import('../../features/songs/song-progress.js'),
        views: ['view-songs'],
        viewPrefixes: ['view-song-'],
    },
    {
        id: 'sessionReview',
        path: '../../features/analysis/session-review.js',
        loader: () => import('../../features/analysis/session-review.js'),
        views: ['view-session-review', 'view-analysis'],
    },
    {
        id: 'coachActions',
        path: '../../features/coach/coach-actions.js',
        loader: () => import('../../features/coach/coach-actions.js'),
        views: ['view-coach'],
    },
    {
        id: 'focusTimer',
        path: '../../features/coach/focus-timer.js',
        loader: () => import('../../features/coach/focus-timer.js'),
        views: ['view-coach'],
    },
    {
        id: 'lessonPlan',
        path: '../../features/coach/lesson-plan.js',
        loader: () => import('../../features/coach/lesson-plan.js'),
        views: ['view-coach'],
    },
    {
        id: 'coachInsights',
        path: '../../features/coach/coach-insights.js',
        loader: () => import('../../features/coach/coach-insights.js'),
        views: ['view-coach'],
    },
    {
        id: 'reminders',
        path: '../../features/notifications/reminders.js',
        loader: () => import('../../features/notifications/reminders.js'),
        views: ['view-settings', 'view-parent'],
    },
    {
        id: 'backupExport',
        path: '../../features/backup/export.js',
        loader: () => import('../../features/backup/export.js'),
        views: ['view-backup'],
    },
    {
        id: 'gameMetrics',
        path: '../../features/games/game-metrics.js',
        loader: () => import('../../features/games/game-metrics.js'),
        views: ['view-games'],
        viewPrefixes: ['view-game-'],
    },
    {
        id: 'gameEnhancements',
        path: '../../features/games/game-enhancements.js',
        loader: () => import('../../features/games/game-enhancements.js'),
        views: ['view-games'],
        viewPrefixes: ['view-game-'],
    },
    {
        id: 'gameHub',
        path: '../../features/games/game-hub.js',
        loader: () => import('../../features/games/game-hub.js'),
        views: ['view-games'],
        viewPrefixes: ['view-game-'],
    },
    {
        id: 'trainerTools',
        path: '../../features/trainer/tools.js',
        loader: () => import('../../features/trainer/tools.js'),
        views: ['view-trainer', 'view-bowing', 'view-posture'],
    },
    {
        id: 'recordings',
        path: '../../features/recordings/recordings.js',
        loader: () => import('../../features/recordings/recordings.js'),
        views: ['view-session-review', 'view-analysis', 'view-songs'],
        viewPrefixes: ['view-song-'],
    },
    {
        id: 'parentPin',
        path: '../../features/parent/pin.js',
        loader: () => import('../../features/parent/pin.js'),
        eager: true,
        views: ['view-parent'],
    },
    {
        id: 'parentRecordings',
        path: '../../features/parent/recordings.js',
        loader: () => import('../../features/parent/recordings.js'),
        views: ['view-parent'],
    },
    {
        id: 'parentGoals',
        path: '../../features/parent/goals.js',
        loader: () => import('../../features/parent/goals.js'),
        views: ['view-parent'],
    },
    {
        id: 'swUpdates',
        path: '../platform/sw-updates.js',
        loader: () => import('../platform/sw-updates.js'),
        idle: true,
        views: ['view-settings'],
    },
    {
        id: 'adaptiveUi',
        path: '../ml/adaptive-ui.js',
        loader: () => import('../ml/adaptive-ui.js'),
        views: ['view-settings'],
    },
    {
        id: 'recommendationsUi',
        path: '../ml/recommendations-ui.js',
        loader: () => import('../ml/recommendations-ui.js'),
        views: ['view-coach', 'view-progress'],
    },
];

const FEATURES_BY_ID = new Map(FEATURES.map((feature) => [feature.id, feature]));

const matchesView = (feature, viewId) => {
    if (!viewId) return false;
    if (feature.views?.includes(viewId)) return true;
    return Array.isArray(feature.viewPrefixes) && feature.viewPrefixes.some((prefix) => viewId.startsWith(prefix));
};

const unique = (list) => Array.from(new Set(list));

const getByFlag = (flag) => FEATURES.filter((feature) => feature[flag]).map((feature) => feature.id);

export const PRIMARY_VIEWS = new Set(['view-home', 'view-coach', 'view-games', 'view-tuner']);

export const FEATURE_PREFETCH = {
    'view-home': ['coachActions', 'lessonPlan', 'gameHub', 'tuner'],
    'view-daily': ['tuner', 'trainerTools', 'songSearch', 'songProgress'],
    'view-coach': ['tuner', 'trainerTools', 'songSearch'],
    'view-games': ['tuner', 'coachActions', 'trainerTools'],
    'view-tuner': ['coachActions', 'gameHub'],
    'view-songs': ['songProgress', 'recordings'],
    'view-settings': ['offlineMode', 'lessonPacks', 'swUpdates'],
};

export const getFeature = (id) => FEATURES_BY_ID.get(id);
export const getEagerFeatureIds = () => getByFlag('eager');
export const getIdleFeatureIds = () => getByFlag('idle');
export const getFeaturesForView = (viewId) => unique(
    FEATURES.filter((feature) => matchesView(feature, viewId)).map((feature) => feature.id)
);
export const getPrefetchTargetsForView = (viewId) => unique(FEATURE_PREFETCH[viewId] || []);

export { FEATURES };
