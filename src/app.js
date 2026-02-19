import { whenReady } from './utils/dom-ready.js';
import {
    getViewId,
    getModulesForView,
    getActiveNavHref,
    isNavItemActive,
} from './utils/app-utils.js';
import { getAudioPath } from './audio/format-detection.js';
import { ViewLoader } from './views/view-loader.js';
import { getRouteMeta, getViewPath } from './views/view-paths.js';
import { showViewError } from './views/view-error.js';
import { canRegisterServiceWorker } from './platform/sw-support.js';
import {
    MODULE_LOADERS as moduleLoaders,
    EAGER_MODULES,
    IDLE_MODULE_PLAN,
    PREFETCH_VIEW_IDS,
} from './app/module-registry.js';
import { createAsyncGate } from './app/async-gate.js';
import './progress/achievement-celebrate.js';

const viewLoader = new ViewLoader();
const viewRenderGate = createAsyncGate();
const SW_CACHE_PREFIXES = ['panda-violin-', 'workbox-'];
const DEV_SW_RESET_FLAG = 'panda-violin-dev-sw-reset';

const loaded = new Map();
const loadModule = (key) => {
    const loader = moduleLoaders[key];
    if (!loader) return Promise.resolve();
    if (loaded.has(key)) return loaded.get(key);
    const promise = loader().catch((error) => {
        loaded.delete(key);
        console.warn(`[App] Failed to load ${key}`, error);
        return null;
    });
    loaded.set(key, promise);
    return promise;
};

const queueIdleTask = (task, delay = 0) => {
    const run = () => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => task(), { timeout: 1500 });
            return;
        }
        window.setTimeout(() => task(), 0);
    };

    if (delay > 0) {
        window.setTimeout(run, delay);
        return;
    }

    run();
};

const loadIdle = (key, delay = 0) => {
    queueIdleTask(() => loadModule(key), delay);
};

const getCurrentViewId = () => getViewId(window.location.hash);

const runModuleInit = (module) => {
    if (!module || typeof module.init !== 'function') return;
    try {
        module.init();
    } catch (error) {
        console.warn('[App] Module init failed', error);
    }
};

const loadForView = async (viewId) => {
    if (!viewId) return;
    const modules = getModulesForView(viewId);
    const loadedModules = await Promise.all(modules.map((module) => loadModule(module)));
    loadedModules.forEach((module) => runModuleInit(module));
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

const activateLoadedView = (container) => {
    container.querySelectorAll('.view').forEach((view) => {
        view.classList.add('is-active');
        view.removeAttribute('hidden');
    });
};

const applyViewPersona = (viewId) => {
    const meta = getRouteMeta(viewId);
    const persona = meta?.persona || 'child';
    document.documentElement.dataset.uiMode = persona;
    document.documentElement.dataset.navGroup = meta?.navGroup || 'utility';
};

const bindChildHomeActions = () => {
    const startBtn = document.querySelector('[data-start-practice]');
    const continueBtn = document.querySelector('[data-continue-practice]');
    const toHashRoute = (target) => {
        if (!target) return '#view-coach';
        if (target.startsWith('#')) return target;
        if (target.startsWith('view-')) return `#${target}`;
        return `#view-game-${target}`;
    };
    const setContinueHref = (target) => {
        const href = toHashRoute(target || document.documentElement.dataset.practiceContinueHref || 'view-coach');
        document.documentElement.dataset.practiceContinueHref = href;
        if (continueBtn) {
            continueBtn.setAttribute('href', href);
        }
    };

    if (startBtn && startBtn.dataset.bound !== 'true') {
        startBtn.dataset.bound = 'true';
        startBtn.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.hash = '#view-coach';
        });
    }

    if (continueBtn) {
        setContinueHref(document.documentElement.dataset.practiceContinueHref || 'view-coach');
        if (continueBtn.dataset.bound !== 'true') {
            continueBtn.dataset.bound = 'true';
            continueBtn.addEventListener('click', () => {
                setContinueHref(document.documentElement.dataset.practiceContinueHref || 'view-coach');
            });
        }
        if (continueBtn.dataset.recommendationBound !== 'true') {
            continueBtn.dataset.recommendationBound = 'true';
            import('./ml/recommendations.js')
                .then(({ getLearningRecommendations }) => getLearningRecommendations())
                .then((recs) => {
                    const stepCta = recs?.lessonSteps?.find((step) => step?.cta)?.cta;
                    const recommended = stepCta || recs?.recommendedGameId || 'view-coach';
                    setContinueHref(recommended);
                })
                .catch(() => {
                    setContinueHref(document.documentElement.dataset.practiceContinueHref || 'view-coach');
                });
        }
    }
};

const bindGameSort = () => {
    const sortControls = Array.from(document.querySelectorAll('input[name="game-sort"]'));
    const cards = Array.from(document.querySelectorAll('.game-card[data-sort-tags]'));
    if (!sortControls.length || !cards.length) return;

    const applySort = () => {
        const selected = sortControls.find((control) => control.checked)?.value || 'quick';
        cards.forEach((card) => {
            const tags = (card.dataset.sortTags || '')
                .split(',')
                .map((token) => token.trim())
                .filter(Boolean);
            const visible = selected === 'all' || tags.includes(selected);
            card.classList.toggle('is-hidden', !visible);
            card.setAttribute('aria-hidden', visible ? 'false' : 'true');
        });
    };

    sortControls.forEach((control) => {
        if (control.dataset.bound === 'true') return;
        control.dataset.bound = 'true';
        control.addEventListener('change', applySort);
    });
    applySort();
};

const bindCoachStepper = () => {
    const tabs = Array.from(document.querySelectorAll('[data-coach-step-target]'));
    const cards = Array.from(document.querySelectorAll('[data-coach-step-card]'));
    if (!tabs.length || !cards.length) return;

    const activate = (target) => {
        tabs.forEach((tab) => {
            const active = tab.dataset.coachStepTarget === target;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        cards.forEach((card) => {
            const active = card.dataset.coachStepCard === target;
            card.classList.toggle('is-active', active);
            card.hidden = !active;
            card.setAttribute('aria-hidden', active ? 'false' : 'true');
        });
    };

    tabs.forEach((tab, index) => {
        if (tab.dataset.bound === 'true') return;
        tab.dataset.bound = 'true';
        tab.addEventListener('click', () => activate(tab.dataset.coachStepTarget));
        if (index === 0 && tab.classList.contains('is-active')) {
            activate(tab.dataset.coachStepTarget);
        }
    });
};

const showView = async (viewId, enhanceCallback) => {
    if (!viewId) return;
    const renderToken = viewRenderGate.begin();

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
        if (!viewRenderGate.isActive(renderToken)) return;
        container.innerHTML = html;
        activateLoadedView(container);
        rewriteAudioSources();

        // Re-enhance any toggle labels in the new view
        if (enhanceCallback) {
            enhanceCallback();
        }

        document.dispatchEvent(new CustomEvent('panda:view-rendered', { detail: { viewId } }));

        // Load modules for this view
        await loadForView(viewId);
        applyViewPersona(viewId);
        bindChildHomeActions();
        bindGameSort();
        bindCoachStepper();
    } catch (err) {
        if (!viewRenderGate.isActive(renderToken)) return;
        console.error('[App] View load failed:', err);
        showViewError('Failed to load view. Please check your connection and try again.');
    }
};

const onWindowLoad = (callback) => {
    if (document.readyState === 'complete') {
        callback();
        return;
    }
    window.addEventListener('load', callback, { once: true });
};

const cleanupDevServiceWorkers = async () => {
    if (!('serviceWorker' in navigator)) return;

    const wasControlled = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
        const keys = await caches.keys();
        const appKeys = keys.filter((key) => SW_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)));
        await Promise.all(appKeys.map((key) => caches.delete(key)));
    }

    if (wasControlled) {
        const alreadyReloaded = window.sessionStorage.getItem(DEV_SW_RESET_FLAG) === '1';
        if (!alreadyReloaded) {
            window.sessionStorage.setItem(DEV_SW_RESET_FLAG, '1');
            window.location.reload();
        }
        return;
    }

    window.sessionStorage.removeItem(DEV_SW_RESET_FLAG);
};

const registerServiceWorker = () => {
    onWindowLoad(() => {
        if (!import.meta.env.PROD) {
            cleanupDevServiceWorkers().catch((err) => console.warn('[SW] dev cleanup failed', err));
            return;
        }
        if (!canRegisterServiceWorker()) return;
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((err) => console.warn('[SW] registration failed', err));
    });
};

const rewriteAudioSources = () => {
    const audioElements = document.querySelectorAll('audio[src*="/assets/audio/"]');
    audioElements.forEach((audio) => {
        const currentSrc = audio.getAttribute('src');
        if (currentSrc) {
            audio.setAttribute('src', getAudioPath(currentSrc));
        }
    });
};

const loadEagerModules = () => {
    EAGER_MODULES.forEach((key) => loadModule(key));
};

const loadIdleModules = () => {
    IDLE_MODULE_PLAN.forEach(([key, delay]) => loadIdle(key, delay));
};

const prefetchLikelyViews = (currentViewId) => {
    PREFETCH_VIEW_IDS.filter((viewId) => viewId !== currentViewId).forEach((viewId, index) => {
        queueIdleTask(() => {
            const viewPath = getViewPath(viewId);
            if (!viewLoader.has(viewPath)) {
                viewLoader.prefetch(viewPath);
            }
        }, 150 + index * 120);
    });
};

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

const resolveInitialView = async () => {
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
    return initialViewId;
};

const setupPopoverSystem = (ctx) => {
    const setPopoverExpanded = (popover, expanded) => {
        if (!popover?.id) return;
        document.querySelectorAll(`[popovertarget="${popover.id}"]`).forEach((button) => {
            button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    };

    const focusFirstPopoverItem = (popover) => {
        if (!popover) return;
        const target = popover.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (target instanceof HTMLElement) {
            target.focus();
        }
    };

    document.querySelectorAll('[popover]').forEach((popover) => {
        popover.addEventListener('toggle', () => {
            const open = popover.matches(':popover-open');
            setPopoverExpanded(popover, open);
            if (open) {
                focusFirstPopoverItem(popover);
            } else if (ctx.lastPopoverTrigger instanceof HTMLElement) {
                ctx.lastPopoverTrigger.focus();
            }
        });
    });

    document.querySelectorAll('[popovertarget]').forEach((button) => {
        button.addEventListener('click', () => {
            ctx.lastPopoverTrigger = button;
        });
    });
};

const setupNavigation = (ctx) => {
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

    ctx.updateNavState = () => {
        const viewId = getCurrentViewId();
        const activeHref = getActiveNavHref(viewId);
        ctx.navItems.forEach((item) => {
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

    ctx.updateNavState();

    document.addEventListener('click', (event) => {
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

const boot = async () => {
    const initialViewId = await resolveInitialView();
    await showView(initialViewId, enhanceToggleLabels);
    if (initialViewId === 'view-onboarding') {
        loadModule('onboarding');
    }

    const ctx = {
        navItems: Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]')),
        prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        lastPopoverTrigger: null,
        updateNavState: null,
    };

    registerServiceWorker();
    setupNavigation(ctx);
    setupPopoverSystem(ctx);
    loadEagerModules();
    loadIdleModules();
    prefetchLikelyViews(initialViewId);

    window.addEventListener('hashchange', async () => {
        const viewId = getCurrentViewId() || 'view-home';
        await showView(viewId, enhanceToggleLabels);
        ctx.updateNavState();
    }, { passive: true });
};

whenReady(boot);
