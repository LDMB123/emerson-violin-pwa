const equals = (...targets) => (viewId) => targets.includes(viewId);
const startsWith = (prefix) => (viewId) => viewId.startsWith(prefix);
const oneOf = (...checks) => (viewId) => checks.some((check) => check(viewId));

export const MODULE_LOADERS = {
    platform: () => import('../platform/native-apis.js'),
    dataSaver: () => import('../platform/data-saver.js'),
    offlineRecovery: () => import('../platform/offline-recovery.js'),
    installGuide: () => import('../platform/install-guide.js'),
    installGuideClose: () => import('../platform/install-guide-close.js'),
    installToast: () => import('../platform/install-toast.js'),
    ipadosCapabilities: () => import('../platform/ipados-capabilities.js'),
    inputCapabilities: () => import('../platform/input-capabilities.js'),
    mlScheduler: () => import('../ml/offline-scheduler.js'),
    mlAccelerator: () => import('../ml/accelerator.js'),
    offlineIntegrity: () => import('../platform/offline-integrity.js'),
    offlineMode: () => import('../platform/offline-mode.js'),
    progress: () => import('../progress/progress.js'),
    persist: () => import('../persistence/persist.js'),
    tuner: () => import('../tuner/tuner.js'),
    songSearch: () => import('../songs/song-search.js'),
    songProgress: () => import('../songs/song-progress.js'),
    sessionReview: () => import('../analysis/session-review.js'),
    coachActions: () => import('../coach/coach-actions.js'),
    focusTimer: () => import('../coach/focus-timer.js'),
    lessonPlan: () => import('../coach/lesson-plan.js'),
    reminders: () => import('../notifications/reminders.js'),
    badging: () => import('../notifications/badging.js'),
    backupExport: () => import('../backup/export.js'),
    gameMetrics: () => import('../games/game-metrics.js'),
    gameEnhancements: () => import('../games/game-enhancements.js'),
    gameComplete: () => import('../games/game-complete.js'),
    trainerTools: () => import('../trainer/tools.js'),
    recordings: () => import('../recordings/recordings.js'),
    parentPin: () => import('../parent/pin.js'),
    parentRecordings: () => import('../parent/recordings.js'),
    parentGoals: () => import('../parent/goals.js'),
    swUpdates: () => import('../platform/sw-updates.js'),
    adaptiveUi: () => import('../ml/adaptive-ui.js'),
    recommendationsUi: () => import('../ml/recommendations-ui.js'),
    audioPlayer: () => import('../audio/audio-player.js'),
    onboarding: () => import('../onboarding/onboarding.js'),
};

export const EAGER_MODULES = [
    'dataSaver',
    'offlineRecovery',
    'progress',
    'persist',
];

export const IDLE_MODULE_PLAN = [
    ['installToast', 0],
    ['mlScheduler', 180],
    ['badging', 420],
    ['audioPlayer', 540],
];

export const PREFETCH_VIEW_IDS = [
    'view-home',
    'view-coach',
    'view-games',
    'view-progress',
    'view-songs',
    'view-trainer',
];

const MODULE_RULES = [
    { when: equals('view-tuner'), modules: ['tuner'] },
    { when: equals('view-session-review', 'view-analysis'), modules: ['sessionReview', 'recordings'] },
    { when: oneOf(equals('view-songs'), startsWith('view-song-')), modules: ['songProgress', 'songSearch', 'recordings'] },
    { when: equals('view-coach'), modules: ['coachActions', 'focusTimer', 'lessonPlan', 'recommendationsUi'] },
    { when: equals('view-home', 'view-progress', 'view-parent'), modules: ['progress'] },
    { when: equals('view-trainer', 'view-bowing', 'view-posture'), modules: ['trainerTools'] },
    { when: equals('view-backup'), modules: ['backupExport'] },
    {
        when: equals('view-parent'),
        modules: [
            'parentPin',
            'parentGoals',
            'parentRecordings',
            'reminders',
            'platform',
            'offlineIntegrity',
            'offlineMode',
            'swUpdates',
            'adaptiveUi',
            'ipadosCapabilities',
            'inputCapabilities',
            'installGuide',
            'installGuideClose',
            'mlAccelerator',
        ],
    },
    { when: oneOf(equals('view-games'), startsWith('view-game-')), modules: ['gameMetrics', 'gameEnhancements', 'gameComplete'] },
    { when: equals('view-progress'), modules: ['recommendationsUi'] },
];

const modulesByView = new Map();

export const resolveModulesForView = (viewId) => {
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
