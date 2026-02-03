import { getViewId as getCurrentViewId, onViewChange } from './core/utils/view-events.js';
import {
    PRIMARY_VIEWS,
    getEagerFeatureIds,
    getFeature,
    getFeaturesForView,
    getIdleFeatureIds,
    getPrefetchTargetsForView,
} from './core/app/feature-registry.js';

const loaded = new Map();
const preloaded = new Set();
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

const loadModule = (featureId) => {
    const feature = getFeature(featureId);
    if (!feature?.loader) return Promise.resolve();
    if (loaded.has(featureId)) return loaded.get(featureId);
    const start = performance?.now ? performance.now() : null;
    const promise = feature.loader()
        .then((module) => {
            if (start !== null && performance?.now) {
                const durationMs = Math.round(performance.now() - start);
                document.dispatchEvent(new CustomEvent('panda:feature-load', {
                    detail: { featureId, durationMs },
                }));
            }
            return module;
        })
        .catch((error) => {
            console.warn(`[App] Failed to load ${featureId}`, error);
        });
    loaded.set(featureId, promise);
    return promise;
};

const loadIdle = (featureId) => {
    scheduleIdle(() => loadModule(featureId));
};

const canPrefetch = () => {
    if (document.prerendering) return false;
    const perfMode = getPerformanceMode();
    const deviceMemory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const lowTier = deviceMemory <= 2 || cores <= 4;
    if (lowTier && perfMode !== 'high') return false;
    const connection = navigator.connection;
    if (!connection) return true;
    if (connection.saveData) return false;
    if (typeof connection.effectiveType === 'string') {
        return !connection.effectiveType.includes('2g');
    }
    return true;
};

const prefetchModule = (featureId) => {
    if (!canPrefetch()) return;
    if (loaded.has(featureId) || preloaded.has(featureId)) return;
    preloaded.add(featureId);
    scheduleIdle(() => loadModule(featureId));
};

const getViewIdFromUrl = (url) => {
    const hash = url?.hash || window.location.hash || '';
    const id = hash.replace('#', '').trim();
    return id || 'view-home';
};

const loadForView = (viewId) => {
    if (!viewId) return;
    getFeaturesForView(viewId).forEach((featureId) => loadModule(featureId));
};

const prefetchForView = (viewId) => {
    if (!viewId) return;
    getPrefetchTargetsForView(viewId).forEach((featureId) => prefetchModule(featureId));
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
    getEagerFeatureIds().forEach((featureId) => loadModule(featureId));
    getIdleFeatureIds().forEach((featureId) => loadIdle(featureId));
    registerServiceWorker();

    const reduceMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = () => reduceMotionMedia.matches;
    const reduceMotionToggle = document.querySelector('#setting-reduce-motion');
    const navItems = Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]'));
    const mainContent = document.querySelector('.main-content');
    const supportsNavigation = () => 'navigation' in window && typeof window.navigation?.addEventListener === 'function';
    const prefetchFromHref = (href) => {
        if (!href) return;
        const viewId = href.replace('#', '').trim();
        if (viewId) prefetchForView(viewId);
    };

    const resetViewScroll = () => {
        if (!mainContent) return;
        mainContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    const applyViewState = (viewId) => {
        loadForView(viewId);
        prefetchForView(viewId);
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

    navItems.forEach((item) => {
        const href = item.getAttribute('href');
        if (!href) return;
        item.addEventListener('pointerenter', () => prefetchFromHref(href), { passive: true });
        item.addEventListener('focus', () => prefetchFromHref(href));
    });

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
