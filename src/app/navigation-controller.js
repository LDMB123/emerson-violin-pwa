import { setAriaCurrent } from '../utils/dom-utils.js';
import { canPrefetchViews, prefetchViewIfMissing } from './view-prefetch.js';

const resetRouteScroll = () => {
    const apply = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.querySelector('.main-content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    apply();
    requestAnimationFrame(apply);
    window.setTimeout(apply, 120);
};

/** Sets up click-driven hash navigation, nav state syncing, and view transitions. */
export const setupNavigationController = ({
    ctx,
    getCurrentViewId,
    getActiveNavHref,
    isNavItemActive,
}) => {
    const supportsViewTransitions = typeof document.startViewTransition === 'function';

    const shouldAnimateNav = () => {
        if (ctx.prefersReducedMotion()) return false;
        if (document.querySelector('#setting-reduce-motion')?.checked) return false;
        return true;
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
        if (supportsViewTransitions && shouldAnimateNav()) {
            // Skip any in-flight transition before starting a new one when the API is available.
            // activeViewTransition is undefined on older engines — optional chain is a safe no-op.
            document.activeViewTransition?.skipTransition();
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
        ctx.navItems.forEach((item) => {
            const itemHref = item.getAttribute('href');
            const active = isNavItemActive(itemHref, activeHref);
            item.classList.toggle('is-active', active);
            setAriaCurrent(item, active);
        });
    };

    ctx.updateNavState = updateNavState;
    updateNavState();

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest('a[href^="#view-"]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        const targetId = link.dataset.scrollTarget;
        const popover = link.closest('[popover]');
        event.preventDefault();
        if (popover) {
            popover.hidePopover();
        }
        if (link.classList.contains('back-btn')) {
            navDirection = 'back';
        }
        navigateTo(href, targetId ? () => scrollToTarget(targetId) : null);
    });
};

// Use the Navigation API for view routing when available.
// hashchange still fires for all other listeners (game lifecycle, metrics, etc.).
const supportsNavigationAPI = 'navigation' in window;

/** Binds hash or Navigation API routing to the supplied view renderer. */
export const bindHashViewController = ({
    getCurrentViewId,
    showView,
    onAfterViewChange,
}) => {
    const showCurrentView = async () => {
        const viewId = getCurrentViewId() || 'view-home';
        await showView(viewId);
        resetRouteScroll();
        onAfterViewChange?.(viewId);
    };

    if (supportsNavigationAPI) {
        navigation.addEventListener('navigate', (event) => {
            if (!event.canIntercept || !event.destination.sameDocument) return;
            event.intercept({
                handler: showCurrentView,
            });
        });
    } else {
        window.addEventListener('hashchange', showCurrentView, { passive: true });
    }

    const syncInitialView = async (initialViewId) => {
        const resolvedViewId = getCurrentViewId() || initialViewId;
        if (resolvedViewId !== initialViewId) {
            await showView(resolvedViewId);
        }
        resetRouteScroll();
        onAfterViewChange?.(resolvedViewId);
    };

    return { syncInitialView };
};

/** Queues low-priority prefetches for likely next views when data saver is off. */
export const prefetchLikelyViews = ({
    currentViewId,
    prefetchViewIds,
    prefetchLimit,
    queueIdleTask,
    getViewPath,
    viewLoader,
}) => {
    if (!canPrefetchViews()) return;

    prefetchViewIds
        .filter((viewId) => viewId !== currentViewId)
        .slice(0, prefetchLimit)
        .forEach((viewId, index) => {
            queueIdleTask(() => {
                prefetchViewIfMissing({ viewId, getViewPath, viewLoader });
            }, 400 + index * 250);
        });
};
