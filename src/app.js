import {
    getViewId,
    getModulesForView,
    getActiveNavHref,
    isNavItemActive,
} from './utils/app-utils.js';
import { getAudioPath } from './audio/format-detection.js';
import { ViewLoader } from './views/view-loader.js';
import { getViewPath } from './views/view-paths.js';
import { showViewError } from './views/view-error.js';
import './progress/achievement-celebrate.js';

const viewLoader = new ViewLoader();

const moduleLoaders = {
    platform: () => import('./platform/native-apis.js'),
    dataSaver: () => import('./platform/data-saver.js'),
    offlineRecovery: () => import('./platform/offline-recovery.js'),
    installGuide: () => import('./platform/install-guide.js'),
    installGuideClose: () => import('./platform/install-guide-close.js'),
    installToast: () => import('./platform/install-toast.js'),
    ipadosCapabilities: () => import('./platform/ipados-capabilities.js'),
    inputCapabilities: () => import('./platform/input-capabilities.js'),
    mlScheduler: () => import('./ml/offline-scheduler.js'),
    mlAccelerator: () => import('./ml/accelerator.js'),
    offlineIntegrity: () => import('./platform/offline-integrity.js'),
    offlineMode: () => import('./platform/offline-mode.js'),
    progress: () => import('./progress/progress.js'),
    persist: () => import('./persistence/persist.js'),
    tuner: () => import('./tuner/tuner.js'),
    songSearch: () => import('./songs/song-search.js'),
    songProgress: () => import('./songs/song-progress.js'),
    sessionReview: () => import('./analysis/session-review.js'),
    coachActions: () => import('./coach/coach-actions.js'),
    focusTimer: () => import('./coach/focus-timer.js'),
    lessonPlan: () => import('./coach/lesson-plan.js'),
    reminders: () => import('./notifications/reminders.js'),
    badging: () => import('./notifications/badging.js'),
    backupExport: () => import('./backup/export.js'),
    gameMetrics: () => import('./games/game-metrics.js'),
    gameEnhancements: () => import('./games/game-enhancements.js'),
    gameComplete: () => import('./games/game-complete.js'),
    trainerTools: () => import('./trainer/tools.js'),
    recordings: () => import('./recordings/recordings.js'),
    parentPin: () => import('./parent/pin.js'),
    parentRecordings: () => import('./parent/recordings.js'),
    parentGoals: () => import('./parent/goals.js'),
    swUpdates: () => import('./platform/sw-updates.js'),
    adaptiveUi: () => import('./ml/adaptive-ui.js'),
    recommendationsUi: () => import('./ml/recommendations-ui.js'),
    audioPlayer: () => import('./audio/audio-player.js'),
    onboarding: () => import('./onboarding/onboarding.js'),
};

const loaded = new Map();
const scheduleIdle = (task) => {
    if (typeof window === 'undefined') return;
    if (document.prerendering) {
        document.addEventListener('prerenderingchange', () => scheduleIdle(task), { once: true });
        return;
    }
    if (globalThis.scheduler?.postTask) {
        globalThis.scheduler.postTask(() => task(), { priority: 'background' });
        return;
    }
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(task, { timeout: 800 });
        return;
    }
    window.setTimeout(() => task({ timeRemaining: () => 0, didTimeout: true }), 300);
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

const getCurrentViewId = () => {
    return getViewId(window.location.hash);
};

const loadForView = (viewId) => {
    if (!viewId) return;
    const modules = getModulesForView(viewId);
    modules.forEach((module) => loadModule(module));
};

const skeletonHTML = `<div class="skeleton-view" aria-hidden="true">
    <div class="skeleton-bar skeleton-header"></div>
    <div class="skeleton-bar skeleton-card"></div>
    <div class="skeleton-row">
        <div class="skeleton-bar skeleton-card-sm"></div>
        <div class="skeleton-bar skeleton-card-sm"></div>
    </div>
    <div class="skeleton-bar skeleton-card-sm"></div>
</div>`;

const showView = async (viewId, enhanceCallback) => {
    if (!viewId) return;

    try {
        const container = document.getElementById('main-content');
        if (!container) {
            console.error('[App] main-content container not found');
            return;
        }

        // Show skeleton while loading (only if view isn't cached)
        const viewPath = getViewPath(viewId);
        if (!viewLoader.has(viewPath)) {
            container.innerHTML = skeletonHTML;
        }

        const html = await viewLoader.load(viewPath);
        container.innerHTML = html;

        // Re-enhance any toggle labels in the new view
        if (enhanceCallback) {
            enhanceCallback();
        }

        // Load modules for this view
        loadForView(viewId);
    } catch (err) {
        console.error('[App] View load failed:', err);
        showViewError('Failed to load view. Please check your connection and try again.');
    }
};

const registerServiceWorker = () => {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((err) => console.warn('[SW] registration failed', err));
    });
};

const boot = async () => {
    if (document.prerendering) {
        document.addEventListener('prerenderingchange', boot, { once: true });
        return;
    }

    // Update all audio elements to use Opus or MP3 based on browser support
    const audioElements = document.querySelectorAll('audio[src*="/assets/audio/"]');
    audioElements.forEach((audio) => {
        const currentSrc = audio.getAttribute('src');
        if (currentSrc) {
            audio.setAttribute('src', getAudioPath(currentSrc));
        }
    });

    loadModule('platform');
    loadModule('dataSaver');
    loadModule('offlineRecovery');
    loadModule('ipadosCapabilities');
    loadModule('inputCapabilities');
    loadModule('progress');
    await loadModule('persist');
    loadIdle('installToast');
    loadIdle('installGuide');
    loadIdle('installGuideClose');
    loadIdle('mlScheduler');
    loadIdle('mlAccelerator');
    loadIdle('offlineIntegrity');
    loadIdle('offlineMode');
    loadIdle('reminders');
    loadIdle('badging');
    loadIdle('audioPlayer');

    const reduceMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = () => reduceMotionMedia.matches;
    const reduceMotionToggle = document.querySelector('#setting-reduce-motion');
    const popoverBackdrop = document.querySelector('[data-popover-backdrop]');
    const supportsPopover = 'showPopover' in HTMLElement.prototype;
    const navItems = Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]'));
    let lastPopoverTrigger = null;

    const enhanceToggleLabels = () => {
        const labels = document.querySelectorAll(
            '.toggle-ui label[for], .song-controls label[for], .focus-controls label[for]'
        );
        labels.forEach((label) => {
            if (label.dataset.keybound === 'true') return;
            label.dataset.keybound = 'true';
            label.setAttribute('role', 'button');
            label.setAttribute('tabindex', '0');
            label.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    label.click();
                }
            });
        });
    };

    // Check first-run onboarding
    let initialViewId = getCurrentViewId() || 'view-home';
    if (initialViewId === 'view-home') {
        try {
            const { shouldShowOnboarding } = await import('./onboarding/onboarding-check.js');
            if (await shouldShowOnboarding()) {
                initialViewId = 'view-onboarding';
            }
        } catch {
            // Onboarding check failed — proceed to home
        }
    }
    await showView(initialViewId, enhanceToggleLabels);
    if (initialViewId === 'view-onboarding') {
        loadModule('onboarding');
    }

    registerServiceWorker();

    window.addEventListener('hashchange', async () => {
        const viewId = getCurrentViewId() || 'view-home';
        await showView(viewId, enhanceToggleLabels);
        updateNavState();
    }, { passive: true });

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

    let navDirection = 'forward';

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
            document.documentElement.dataset.navDirection = navDirection;
            const transition = document.startViewTransition(() => {
                window.location.hash = href;
            });
            transition.finished.then(() => {
                delete document.documentElement.dataset.navDirection;
            }).catch(() => {});
            navDirection = 'forward';
        } else {
            window.location.hash = href;
        }
    };

    const updateNavState = () => {
        const viewId = getCurrentViewId();
        const activeHref = getActiveNavHref(viewId);
        navItems.forEach((item) => {
            const itemHref = item.getAttribute('href');
            const active = isNavItemActive(itemHref, activeHref);
            item.classList.toggle('is-active', active);
            if (active) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    };

    updateNavState();

    const openPopoverFallback = (popover) => {
        if (!popover) return;
        popover.dataset.fallbackOpen = 'true';
        setPopoverExpanded(popover, true);
        focusFirstPopoverItem(popover);
        document.documentElement.classList.add('popover-open');
        if (popoverBackdrop) {
            popoverBackdrop.hidden = false;
            popoverBackdrop.classList.add('is-open');
        }
    };

    const closePopoverFallback = (popover) => {
        if (popover) {
            delete popover.dataset.fallbackOpen;
            setPopoverExpanded(popover, false);
        }
        if (popoverBackdrop) {
            popoverBackdrop.classList.remove('is-open');
            popoverBackdrop.hidden = true;
        }
        document.documentElement.classList.remove('popover-open');
        if (lastPopoverTrigger instanceof HTMLElement) {
            lastPopoverTrigger.focus();
        }
    };

    if (supportsPopover) {
        document.querySelectorAll('[popover]').forEach((popover) => {
            popover.addEventListener('toggle', () => {
                const open = popover.matches(':popover-open');
                setPopoverExpanded(popover, open);
                if (open) {
                    focusFirstPopoverItem(popover);
                } else if (lastPopoverTrigger instanceof HTMLElement) {
                    lastPopoverTrigger.focus();
                }
            });
        });
    }

    const focusFirstPopoverItem = (popover) => {
        if (!popover) return;
        const target = popover.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (target instanceof HTMLElement) {
            target.focus();
        }
    };

    document.querySelectorAll('[popovertarget]').forEach((button) => {
        button.addEventListener('click', () => {
            lastPopoverTrigger = button;
        });
    });

    if (!supportsPopover) {
        document.querySelectorAll('[popovertarget]').forEach((button) => {
            button.addEventListener('click', (event) => {
                const targetId = button.getAttribute('popovertarget');
                const popover = targetId ? document.getElementById(targetId) : null;
                if (!popover) return;
                event.preventDefault();
                if (popover.dataset.fallbackOpen === 'true') {
                    closePopoverFallback(popover);
                } else {
                    openPopoverFallback(popover);
                }
            });
        });

        popoverBackdrop?.addEventListener('click', () => {
            const openPopover = document.querySelector('[data-fallback-open="true"]');
            if (openPopover) closePopoverFallback(openPopover);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            const openPopover = document.querySelector('[data-fallback-open="true"]');
            if (openPopover) closePopoverFallback(openPopover);
        });

        window.addEventListener('hashchange', () => {
            const openPopover = document.querySelector('[data-fallback-open="true"]');
            if (openPopover) closePopoverFallback(openPopover);
        }, { passive: true });
    }

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
                closePopoverFallback(popover);
            }
        }
        if (link.classList.contains('back-btn')) {
            navDirection = 'back';
        }
        navigateTo(href, targetId ? () => scrollToTarget(targetId) : null);
    });

    if (!supportsPopover) {
        document.querySelectorAll('[popovertargetaction="hide"]').forEach((button) => {
            button.addEventListener('click', (event) => {
                const popover = button.closest('[popover]');
                if (!popover) return;
                event.preventDefault();
                closePopoverFallback(popover);
            });
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
