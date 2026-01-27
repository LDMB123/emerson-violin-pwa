const moduleLoaders = {
    platform: () => import('./platform/native-apis.js'),
    progress: () => import('./progress/progress.js'),
    persist: () => import('./persistence/persist.js'),
    tuner: () => import('./tuner/tuner.js'),
    songSearch: () => import('./songs/song-search.js'),
    songProgress: () => import('./songs/song-progress.js'),
    sessionReview: () => import('./analysis/session-review.js'),
    coachActions: () => import('./coach/coach-actions.js'),
    focusTimer: () => import('./coach/focus-timer.js'),
    reminders: () => import('./notifications/reminders.js'),
    backupExport: () => import('./backup/export.js'),
    gameMetrics: () => import('./games/game-metrics.js'),
    recordings: () => import('./recordings/recordings.js'),
    parentPin: () => import('./parent/pin.js'),
    swUpdates: () => import('./platform/sw-updates.js'),
};

const loaded = new Map();

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

const getViewId = () => {
    const hash = window.location.hash || '';
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
    }

    if (viewId === 'view-settings') {
        loadModule('swUpdates');
    }

    if (viewId === 'view-backup') {
        loadModule('backupExport');
    }

    if (viewId === 'view-parent') {
        loadModule('parentPin');
        loadModule('reminders');
    }

    if (viewId === 'view-games' || viewId.startsWith('view-game-')) {
        loadModule('gameMetrics');
    }
};

const registerServiceWorker = () => {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
    });
};

const boot = () => {
    loadModule('platform');
    loadModule('progress');
    loadModule('persist');
    loadModule('reminders');
    loadForView(getViewId());
    registerServiceWorker();

    window.addEventListener('hashchange', () => {
        loadForView(getViewId());
    }, { passive: true });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reduceMotionToggle = document.querySelector('#setting-reduce-motion');

    const shouldAnimateNav = () => {
        if (prefersReducedMotion) return false;
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
