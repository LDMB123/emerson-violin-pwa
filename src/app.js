import { getViewId as getCurrentViewId, onViewChange } from './core/utils/view-events.js';

const moduleLoaders = {
    platform: () => import('./core/platform/native-apis.js'),
    installGuide: () => import('./core/platform/install-guide.js'),
    ipadosCapabilities: () => import('./core/platform/ipados-capabilities.js'),
    capabilityRegistry: () => import('./core/platform/capability-registry.js'),
    performanceMode: () => import('./core/platform/performance-mode.js'),
    perfTelemetry: () => import('./core/platform/perf-telemetry.js'),
    mlScheduler: () => import('./core/ml/offline-scheduler.js'),
    mlBackend: () => import('./core/ml/backend-manager.js'),
    mlInference: () => import('./core/ml/inference.js'),
    offlineIntegrity: () => import('./core/platform/offline-integrity.js'),
    offlineMode: () => import('./core/platform/offline-mode.js'),
    progress: () => import('./features/progress/progress.js'),
    persist: () => import('./core/persistence/persist.js'),
    tuner: () => import('./features/tuner/tuner.js'),
    songSearch: () => import('./features/songs/song-search.js'),
    songProgress: () => import('./features/songs/song-progress.js'),
    sessionReview: () => import('./features/analysis/session-review.js'),
    coachActions: () => import('./features/coach/coach-actions.js'),
    focusTimer: () => import('./features/coach/focus-timer.js'),
    lessonPlan: () => import('./features/coach/lesson-plan.js'),
    coachInsights: () => import('./features/coach/coach-insights.js'),
    reminders: () => import('./features/notifications/reminders.js'),
    backupExport: () => import('./features/backup/export.js'),
    gameMetrics: () => import('./features/games/game-metrics.js'),
    gameEnhancements: () => import('./features/games/game-enhancements.js'),
    gameHub: () => import('./features/games/game-hub.js'),
    trainerTools: () => import('./features/trainer/tools.js'),
    recordings: () => import('./features/recordings/recordings.js'),
    parentPin: () => import('./features/parent/pin.js'),
    parentRecordings: () => import('./features/parent/recordings.js'),
    parentGoals: () => import('./features/parent/goals.js'),
    swUpdates: () => import('./core/platform/sw-updates.js'),
    adaptiveUi: () => import('./core/ml/adaptive-ui.js'),
    recommendationsUi: () => import('./core/ml/recommendations-ui.js'),
};

const loaded = new Map();
const PRIMARY_VIEWS = new Set(['view-home', 'view-coach', 'view-games', 'view-tuner']);
const getPerformanceMode = () => document.documentElement?.dataset?.perfMode || 'balanced';

const scheduleIdle = (task) => {
    if (typeof window === 'undefined') return;
    if (document.prerendering) {
        document.addEventListener('prerenderingchange', () => scheduleIdle(task), { once: true });
        return;
    }
    const perfMode = getPerformanceMode();
    const prefersFast = perfMode === 'high';
    if (globalThis.scheduler?.postTask) {
        globalThis.scheduler.postTask(() => task(), { priority: prefersFast ? 'user-visible' : 'background' });
        return;
    }
    if (!prefersFast && 'requestIdleCallback' in window) {
        window.requestIdleCallback(task, { timeout: 1500 });
        return;
    }
    window.setTimeout(() => task({ timeRemaining: () => 0, didTimeout: true }), prefersFast ? 200 : 600);
};

const loadModule = (key) => {
    const loader = moduleLoaders[key];
    if (!loader) return Promise.resolve();
    if (loaded.has(key)) return loaded.get(key);
    const promise = loader().catch((error) => {
        console.warn(`[App] Failed to load ${key}`, error);
    });
    loaded.set(key, promise);
    return promise;
};

const loadIdle = (key) => {
    scheduleIdle(() => loadModule(key));
};

const getViewIdFromUrl = (url) => {
    const hash = url?.hash || window.location.hash || '';
    const id = hash.replace('#', '').trim();
    return id || 'view-home';
};

const loadForView = (viewId) => {
    if (!viewId) return;

    if (viewId === 'view-tuner') {
        loadModule('tuner');
    }

    if (viewId === 'view-session-review' || viewId === 'view-analysis') {
        loadModule('sessionReview');
        loadModule('recordings');
    }

    if (viewId === 'view-songs' || viewId.startsWith('view-song-')) {
        loadModule('songProgress');
        loadModule('songSearch');
        loadModule('recordings');
    }

    if (viewId === 'view-coach') {
        loadModule('coachActions');
        loadModule('focusTimer');
        loadModule('lessonPlan');
        loadModule('recommendationsUi');
        loadModule('coachInsights');
    }

    if (viewId === 'view-trainer' || viewId === 'view-bowing' || viewId === 'view-posture') {
        loadModule('trainerTools');
    }

    if (viewId === 'view-settings') {
        loadModule('swUpdates');
        loadModule('adaptiveUi');
        loadModule('offlineMode');
        loadModule('reminders');
    }

    if (viewId === 'view-backup') {
        loadModule('backupExport');
    }

    if (viewId === 'view-parent') {
        loadModule('parentPin');
        loadModule('parentGoals');
        loadModule('parentRecordings');
        loadModule('reminders');
    }

    if (viewId === 'view-games' || viewId.startsWith('view-game-')) {
        loadModule('gameMetrics');
        loadModule('gameEnhancements');
        loadModule('gameHub');
    }

    if (viewId === 'view-progress') {
        loadModule('recommendationsUi');
    }
};

const registerServiceWorker = () => {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => { });
    });
};

const boot = () => {
    if (document.prerendering) {
        document.addEventListener('prerenderingchange', boot, { once: true });
        return;
    }
    loadModule('platform');
    loadModule('ipadosCapabilities');
    loadIdle('capabilityRegistry');
    loadModule('performanceMode');
    loadModule('perfTelemetry');
    loadModule('progress');
    loadModule('persist');
    loadModule('parentPin');
    loadIdle('installGuide');
    loadIdle('swUpdates');
    loadIdle('mlScheduler');
    loadIdle('mlBackend');
    loadIdle('mlInference');
    loadIdle('offlineIntegrity');
    loadIdle('offlineMode');
    loadIdle('reminders');
    registerServiceWorker();

    const reduceMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = () => reduceMotionMedia.matches;
    const reduceMotionToggle = document.querySelector('#setting-reduce-motion');
    const navItems = Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]'));
    const mainContent = document.querySelector('.main-content');
    const supportsNavigation = () => 'navigation' in window && typeof window.navigation?.addEventListener === 'function';

    const resetViewScroll = () => {
        if (!mainContent) return;
        mainContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    const applyViewState = (viewId) => {
        loadForView(viewId);
        updateNavState(viewId);
        resetViewScroll();
        document.dispatchEvent(new CustomEvent('panda:view-change', { detail: { viewId } }));
    };

    const setPopoverExpanded = (popover, expanded) => {
        if (!popover?.id) return;
        document.querySelectorAll(`[popovertarget="${popover.id}"]`).forEach((button) => {
            button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    };

    const shouldAnimateNav = () => {
        if (prefersReducedMotion()) return false;
        if (reduceMotionToggle?.checked) return false;
        return 'startViewTransition' in document;
    };

    const scrollToTarget = (targetId) => {
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (!target) return;
        const behavior = shouldAnimateNav() ? 'smooth' : 'auto';
        requestAnimationFrame(() => {
            target.scrollIntoView({ behavior, block: 'start' });
        });
    };

    const navigateTo = (href, afterNav) => {
        if (!href) return;
        if (href === window.location.hash) {
            if (afterNav) afterNav();
            return;
        }
        if (supportsNavigation() && typeof window.navigation.navigate === 'function') {
            const url = new URL(href, window.location.href);
            const nav = window.navigation.navigate(url.toString());
            if (afterNav) {
                nav.finished.then(afterNav).catch(() => afterNav());
            }
            return;
        }
        if (afterNav) {
            const handle = () => afterNav();
            window.addEventListener('hashchange', handle, { once: true });
        }
        if (shouldAnimateNav()) {
            document.startViewTransition(() => {
                window.location.hash = href;
            });
        } else {
            window.location.hash = href;
        }
    };

    const updateNavState = (viewId = getCurrentViewId()) => {
        const activeHref = PRIMARY_VIEWS.has(viewId) ? `#${viewId}` : null;
        navItems.forEach((item) => {
            const isActive = activeHref && item.getAttribute('href') === activeHref;
            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    };

    if (supportsNavigation()) {
        window.navigation.addEventListener('navigate', (event) => {
            if (!event?.canIntercept) return;
            const destinationUrl = new URL(event.destination.url);
            if (destinationUrl.origin !== window.location.origin) return;
            event.intercept({
                scroll: 'manual',
                async handler() {
                    const viewId = getViewIdFromUrl(destinationUrl);
                    if (shouldAnimateNav()) {
                        await document.startViewTransition(() => {
                            applyViewState(viewId);
                        });
                    } else {
                        applyViewState(viewId);
                    }
                },
            });
        });
    } else {
        onViewChange((viewId) => {
            applyViewState(viewId);
        }, { includePanda: false });
    }
    applyViewState(getCurrentViewId());
    const popovers = Array.from(document.querySelectorAll('[popover]'));
    popovers.forEach((popover) => {
        popover.addEventListener('toggle', () => {
            const open = popover.matches(':popover-open');
            setPopoverExpanded(popover, open);
            if (open) {
                focusFirstPopoverItem(popover);
            }
        });
    });

    const focusFirstPopoverItem = (popover) => {
        if (!popover) return;
        const target = popover.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (target instanceof HTMLElement) {
            target.focus();
        }
    };

    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#view-"]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        const targetId = link.dataset.scrollTarget;
        const popover = link.closest('[popover]');
        event.preventDefault();
        if (popover) {
            if (typeof popover.hidePopover === 'function') {
                popover.hidePopover();
            } else {
                popover.removeAttribute('open');
            }
        }
        navigateTo(href, targetId ? () => scrollToTarget(targetId) : null);
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
