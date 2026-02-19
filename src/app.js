import { whenReady } from './utils/dom-ready.js';
import {
    getViewId,
    getModulesForView,
    getActiveNavHref,
    isNavItemActive,
    toMissionCheckpointHref,
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
const INTERACTIVE_LABEL_SELECTOR = '.toggle-ui label[for], .song-controls label[for], .focus-controls label[for]';
const PREFETCH_LIMIT = 3;
const GAME_FAVORITES_KEY = 'panda-violin:game-favorites:v1';
const GAME_QUICK_TARGET = 6;
let interactiveLabelKeysBound = false;
let coachStepperAutoBound = false;
let activateCoachStep = null;

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
    if ('scheduler' in window && typeof window.scheduler?.postTask === 'function') {
        window.scheduler.postTask(task, { priority: 'background', delay });
        return;
    }

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

const getInlineInitialView = () => {
    const container = document.getElementById('main-content');
    if (!container) return null;
    const initialViewId = container.dataset.initialViewId;
    const inlineView = container.querySelector(':scope > .view');
    if (!initialViewId || !inlineView || inlineView.id !== initialViewId) return null;
    return {
        viewId: initialViewId,
        html: container.innerHTML,
    };
};

const seedInlineInitialViewCache = () => {
    const inlineInitialView = getInlineInitialView();
    if (!inlineInitialView) return;
    try {
        viewLoader.seed(getViewPath(inlineInitialView.viewId), inlineInitialView.html);
    } catch {
        // Ignore invalid route metadata.
    }
};

const warmInitialViews = () => {
    if (navigator.connection?.saveData) return;

    const candidateIds = new Set();
    const currentViewId = getCurrentViewId();
    if (currentViewId?.startsWith('view-')) {
        candidateIds.add(currentViewId);
    }
    const inlineInitialView = getInlineInitialView();
    candidateIds.forEach((viewId) => {
        if (viewId === inlineInitialView?.viewId) return;
        try {
            const viewPath = getViewPath(viewId);
            if (!viewLoader.has(viewPath)) {
                viewLoader.prefetch(viewPath);
            }
        } catch {
            // Ignore invalid/unknown routes during warmup.
        }
    });
};

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

const toHashRoute = (target) => {
    if (!target) return '#view-coach';
    if (target.startsWith('#')) return target;
    if (target.startsWith('view-')) return `#${target}`;
    return `#view-game-${target}`;
};

const getResumeLabel = (href) => {
    const viewId = getViewId(href);
    if (viewId.startsWith('view-game-')) return 'Resume Game';
    if (viewId.startsWith('view-song-')) return 'Resume Song';
    if (viewId === 'view-tuner') return 'Resume Tuner';
    if (viewId === 'view-progress') return 'See Wins';

    const meta = getRouteMeta(viewId);
    if (meta?.navGroup === 'games') return 'Resume Games';
    if (meta?.navGroup === 'songs') return 'Resume Songs';
    if (meta?.navGroup === 'practice') return 'Resume Mission';
    return 'Resume';
};

const setContinueHref = (continueBtn, target) => {
    const href = toHashRoute(target || document.documentElement.dataset.practiceContinueHref || 'view-coach');
    document.documentElement.dataset.practiceContinueHref = href;
    if (continueBtn) {
        continueBtn.setAttribute('href', href);
        continueBtn.textContent = getResumeLabel(href);
    }
};

const updatePracticeContinueCheckpoint = (viewId) => {
    const checkpointHref = toMissionCheckpointHref(viewId);
    if (!checkpointHref) return;
    document.documentElement.dataset.practiceContinueHref = checkpointHref;
};

const bindChildHomeActions = (container) => {
    const startBtn = container.querySelector('[data-start-practice]');
    const continueBtn = container.querySelector('[data-continue-practice]');
    if (startBtn && startBtn.dataset.bound !== 'true') {
        startBtn.dataset.bound = 'true';
        startBtn.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.hash = '#view-coach';
        });
    }

    if (continueBtn) {
        setContinueHref(continueBtn, document.documentElement.dataset.practiceContinueHref || 'view-coach');
        if (continueBtn.dataset.bound !== 'true') {
            continueBtn.dataset.bound = 'true';
            continueBtn.addEventListener('click', () => {
                setContinueHref(continueBtn, document.documentElement.dataset.practiceContinueHref || 'view-coach');
            });
        }
        if (continueBtn.dataset.recommendationBound !== 'true') {
            continueBtn.dataset.recommendationBound = 'true';
            import('./ml/recommendations.js')
                .then(({ getLearningRecommendations }) => getLearningRecommendations())
                .then((recs) => {
                    const missionStep = Array.isArray(recs?.mission?.steps)
                        ? recs.mission.steps.find((step) => step.id === recs?.mission?.currentStepId)
                        : null;
                    const missionTarget = missionStep?.target || missionStep?.cta;
                    const actionTarget = Array.isArray(recs?.nextActions)
                        ? recs.nextActions.find((action) => action?.href)?.href
                        : null;
                    const recommended = missionTarget || actionTarget || recs?.recommendedGameId || 'view-coach';
                    setContinueHref(continueBtn, recommended);
                })
                .catch(() => {
                    setContinueHref(continueBtn, document.documentElement.dataset.practiceContinueHref || 'view-coach');
                });
        }
    }
};

const bindGameSort = (container) => {
    const sortControls = Array.from(container.querySelectorAll('input[name="game-sort"]'));
    const cards = Array.from(container.querySelectorAll('.game-card[data-sort-tags]'));
    if (!sortControls.length || !cards.length) return;
    const emptyState = container.querySelector('[data-games-empty]');

    const toGameId = (value) => {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('#view-game-')) return trimmed.slice('#view-game-'.length);
        if (trimmed.startsWith('view-game-')) return trimmed.slice('view-game-'.length);
        return trimmed;
    };

    const readFavoriteIds = () => {
        try {
            const stored = JSON.parse(window.localStorage.getItem(GAME_FAVORITES_KEY) || '[]');
            if (!Array.isArray(stored)) return [];
            return stored.filter((value, index, list) => (
                typeof value === 'string'
                && value.trim()
                && list.indexOf(value) === index
            ));
        } catch {
            return [];
        }
    };

    const writeFavoriteIds = (ids) => {
        try {
            window.localStorage.setItem(GAME_FAVORITES_KEY, JSON.stringify(ids));
        } catch {
            // Ignore local storage write failures.
        }
    };

    const tagsForCard = (card) => (
        (card.dataset.sortTags || '')
            .split(',')
            .map((token) => token.trim())
            .filter(Boolean)
    );

    const cardById = new Map(
        cards
            .map((card) => [card.dataset.gameId, card])
            .filter(([id]) => Boolean(id)),
    );
    if (!cardById.size) return;

    const sortTagsById = new Map(
        Array.from(cardById.entries()).map(([id, card]) => [id, tagsForCard(card)]),
    );

    const fallbackQuickIds = Array.from(cardById.entries())
        .filter(([, card]) => tagsForCard(card).includes('quick'))
        .map(([id]) => id);
    const fallbackNewIds = Array.from(cardById.entries())
        .filter(([, card]) => tagsForCard(card).includes('new'))
        .map(([id]) => id);

    let quickIds = new Set(fallbackQuickIds);
    let newIds = new Set(fallbackNewIds);
    let favoriteIds = new Set(readFavoriteIds().filter((id) => cardById.has(id)));

    const syncFavoriteStorage = () => {
        const nextIds = Array.from(favoriteIds).filter((id) => cardById.has(id));
        favoriteIds = new Set(nextIds);
        writeFavoriteIds(nextIds);
    };

    const ensureFavoriteButton = (card) => {
        let button = card.querySelector('[data-game-favorite]');
        if (button) return button;
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-favorite-btn';
        button.dataset.gameFavorite = 'true';
        card.appendChild(button);
        return button;
    };

    const syncFavoriteButton = (card) => {
        const id = card.dataset.gameId;
        if (!id) return;
        const button = ensureFavoriteButton(card);
        const active = favoriteIds.has(id);
        const title = card.querySelector('.game-title')?.textContent?.trim() || 'game';
        button.textContent = active ? '★' : '☆';
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        button.setAttribute('aria-label', `${active ? 'Remove' : 'Add'} ${title} ${active ? 'from' : 'to'} favorites`);
        card.classList.toggle('is-favorite', active);
    };

    const updateEmptyState = (selected, visibleCount) => {
        if (!emptyState) return;
        if (visibleCount > 0) {
            emptyState.hidden = true;
            return;
        }
        const messageByFilter = {
            quick: 'No quick picks available yet.',
            favorites: favoriteIds.size
                ? 'No favorite games match this view yet.'
                : 'No favorites yet. Tap ☆ on any game to save it.',
            new: 'No new games left right now. Great progress!',
        };
        emptyState.textContent = messageByFilter[selected] || 'No games available yet.';
        emptyState.hidden = false;
    };

    const shouldShowCard = (card, selected) => {
        const id = card.dataset.gameId || '';
        const tags = sortTagsById.get(id) || [];
        if (selected === 'favorites') {
            if (favoriteIds.size > 0) return favoriteIds.has(id);
            return tags.includes('favorites');
        }
        if (selected === 'new') {
            if (newIds.size > 0) return newIds.has(id);
            return tags.includes('new');
        }
        if (selected === 'quick') {
            if (quickIds.size > 0) return quickIds.has(id);
            return tags.includes('quick');
        }
        return true;
    };

    const applySort = () => {
        const selected = sortControls.find((control) => control.checked)?.value || 'quick';
        let visibleCount = 0;
        cards.forEach((card) => {
            const visible = shouldShowCard(card, selected);
            card.classList.toggle('is-hidden', !visible);
            card.setAttribute('aria-hidden', visible ? 'false' : 'true');
            if (visible) {
                card.removeAttribute('tabindex');
                visibleCount += 1;
            } else {
                card.setAttribute('tabindex', '-1');
            }
        });
        updateEmptyState(selected, visibleCount);
    };

    const hydrateDynamicSets = async () => {
        const [eventsResult, recsResult] = await Promise.allSettled([
            import('./persistence/loaders.js').then((module) => module.loadEvents()),
            import('./ml/recommendations.js').then((module) => module.getLearningRecommendations()),
        ]);

        const events = (eventsResult.status === 'fulfilled' && Array.isArray(eventsResult.value))
            ? eventsResult.value
            : [];
        const playedRecent = [];
        events
            .filter((event) => event?.type === 'game' && typeof event?.id === 'string')
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .forEach((event) => {
                const id = toGameId(event.id);
                if (!id || playedRecent.includes(id)) return;
                playedRecent.push(id);
            });
        const playedSet = new Set(playedRecent);

        const recs = recsResult.status === 'fulfilled' ? recsResult.value : null;
        const recommendedId = toGameId(
            recs?.recommendedGameId
                || recs?.recommendedGame
                || recs?.lessonSteps?.find((step) => step?.cta)?.cta,
        );

        const quickOrdered = [];
        const pushQuick = (id) => {
            if (!id || !cardById.has(id) || quickOrdered.includes(id)) return;
            quickOrdered.push(id);
        };
        pushQuick(recommendedId);
        playedRecent.forEach(pushQuick);
        fallbackQuickIds.forEach(pushQuick);

        if (quickOrdered.length) {
            quickIds = new Set(quickOrdered.slice(0, Math.max(GAME_QUICK_TARGET, fallbackQuickIds.length)));
        }

        const unplayedIds = Array.from(cardById.keys()).filter((id) => !playedSet.has(id));
        newIds = new Set(unplayedIds.length ? unplayedIds : fallbackNewIds);

        applySort();
    };

    syncFavoriteStorage();
    cards.forEach((card) => {
        const button = ensureFavoriteButton(card);
        syncFavoriteButton(card);
        if (button.dataset.gameFavoriteBound === 'true') return;
        button.dataset.gameFavoriteBound = 'true';
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const id = card.dataset.gameId;
            if (!id) return;
            if (favoriteIds.has(id)) {
                favoriteIds.delete(id);
            } else {
                favoriteIds.add(id);
            }
            syncFavoriteStorage();
            syncFavoriteButton(card);
            applySort();
        });
    });

    sortControls.forEach((control) => {
        if (control.dataset.bound === 'true') return;
        control.dataset.bound = 'true';
        control.addEventListener('change', applySort);
    });
    applySort();
    hydrateDynamicSets().catch(() => {});
};

const bindCoachStepper = (container) => {
    const tabs = Array.from(container.querySelectorAll('[data-coach-step-target]'));
    const cards = Array.from(container.querySelectorAll('[data-coach-step-card]'));
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

    activateCoachStep = activate;

    tabs.forEach((tab, index) => {
        if (tab.dataset.bound === 'true') return;
        tab.dataset.bound = 'true';
        tab.addEventListener('click', () => activate(tab.dataset.coachStepTarget));
        if (index === 0 && tab.classList.contains('is-active')) {
            activate(tab.dataset.coachStepTarget);
        }
    });

    if (!coachStepperAutoBound) {
        coachStepperAutoBound = true;
        const canAutoSwitch = () => window.location.hash === '#view-coach' && typeof activateCoachStep === 'function';

        document.addEventListener('panda:rt-session-started', () => {
            if (!canAutoSwitch()) return;
            activateCoachStep('warmup');
        });

        document.addEventListener('panda:lesson-step', (event) => {
            if (!canAutoSwitch()) return;
            const state = event.detail?.state;
            if (state === 'start' || state === 'complete') {
                activateCoachStep('play');
            }
        });

        document.addEventListener('panda:lesson-complete', () => {
            if (!canAutoSwitch()) return;
            activateCoachStep('play');
        });

        document.addEventListener('panda:game-recorded', () => {
            if (!canAutoSwitch()) return;
            activateCoachStep('play');
        });

        document.addEventListener('panda:coach-mission-complete', () => {
            if (!canAutoSwitch()) return;
            activateCoachStep('play');
        });
    }
};

const showView = async (viewId, ctx = null) => {
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
        const inlineView = container.querySelector(':scope > .view');
        const canHydrateInline = container.dataset.initialViewId === viewId
            && inlineView?.id === viewId
            && container.dataset.inlineHydrated !== 'true';
        if (!viewLoader.has(viewPath) && !canHydrateInline) {
            container.innerHTML = skeletonHTML;
        }

        if (canHydrateInline) {
            viewLoader.seed(viewPath, container.innerHTML);
            container.dataset.inlineHydrated = 'true';
        } else {
            const viewFragment = await viewLoader.clone(viewPath);
            if (!viewRenderGate.isActive(renderToken)) return;
            container.replaceChildren(viewFragment);
        }
        activateLoadedView(container);
        rewriteAudioSources(container);
        prepareInteractiveLabels(container);
        if (ctx?.bindPopovers) {
            ctx.bindPopovers(container);
        }

        document.dispatchEvent(new CustomEvent('panda:view-rendered', { detail: { viewId } }));

        // Load modules for this view
        await loadForView(viewId);
        applyViewPersona(viewId);
        updatePracticeContinueCheckpoint(viewId);
        bindChildHomeActions(container);
        bindGameSort(container);
        bindCoachStepper(container);
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

const rewriteAudioSources = (root = document) => {
    const audioElements = root.querySelectorAll('audio[src*="/assets/audio/"]');
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
    if (navigator.connection?.saveData) return;

    PREFETCH_VIEW_IDS
        .filter((viewId) => viewId !== currentViewId)
        .slice(0, PREFETCH_LIMIT)
        .forEach((viewId, index) => {
        queueIdleTask(() => {
            const viewPath = getViewPath(viewId);
            if (!viewLoader.has(viewPath)) {
                viewLoader.prefetch(viewPath);
            }
        }, 400 + index * 250);
    });
};

const prepareInteractiveLabels = (root = document) => {
    root.querySelectorAll(INTERACTIVE_LABEL_SELECTOR).forEach((label) => {
        label.setAttribute('role', 'button');
        label.setAttribute('tabindex', '0');
    });
};

const bindInteractiveLabelKeys = () => {
    if (interactiveLabelKeysBound) return;
    interactiveLabelKeysBound = true;
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (!(event.target instanceof HTMLLabelElement)) return;
        if (!event.target.matches(INTERACTIVE_LABEL_SELECTOR)) return;
        event.preventDefault();
        event.target.click();
    });
};

const resolveInitialView = async () => {
    const hasExplicitHash = window.location.hash.startsWith('#view-');
    let initialViewId = getCurrentViewId() || 'view-home';
    if (!hasExplicitHash && initialViewId === 'view-home') {
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

    const bindPopovers = (root = document) => {
        root.querySelectorAll('[popover]').forEach((popover) => {
            if (popover.dataset.popoverBound === 'true') return;
            popover.dataset.popoverBound = 'true';
            setPopoverExpanded(popover, popover.matches(':popover-open'));
            popover.addEventListener('toggle', () => {
                const open = popover.matches(':popover-open');
                setPopoverExpanded(popover, open);
                if (open) {
                    focusFirstPopoverItem(popover);
                } else if (ctx.lastPopoverTrigger instanceof HTMLElement && ctx.lastPopoverTrigger.isConnected) {
                    ctx.lastPopoverTrigger.focus();
                }
            });
        });

        root.querySelectorAll('[popovertarget]').forEach((button) => {
            if (button.dataset.popoverTriggerBound === 'true') return;
            button.dataset.popoverTriggerBound = 'true';
            button.addEventListener('click', () => {
                ctx.lastPopoverTrigger = button;
            });
        });
    };

    ctx.bindPopovers = bindPopovers;
    bindPopovers(document);
};

const setupNavigation = (ctx) => {
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

const boot = async () => {
    const initialViewId = await resolveInitialView();
    await showView(initialViewId);

    const ctx = {
        navItems: Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]')),
        prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        lastPopoverTrigger: null,
        bindPopovers: null,
        updateNavState: null,
    };

    registerServiceWorker();
    setupNavigation(ctx);
    setupPopoverSystem(ctx);
    bindInteractiveLabelKeys();
    loadEagerModules();
    loadIdleModules();
    prefetchLikelyViews(initialViewId);

    const onHashChange = async () => {
        const viewId = getCurrentViewId() || 'view-home';
        await showView(viewId, ctx);
        ctx.updateNavState();
    };

    window.addEventListener('hashchange', onHashChange, { passive: true });

    const resolvedViewId = getCurrentViewId() || 'view-home';
    if (resolvedViewId !== initialViewId) {
        await showView(resolvedViewId, ctx);
    }
    ctx.updateNavState();
    window.__PANDA_APP_READY__ = true;
};

whenReady(() => {
    seedInlineInitialViewCache();
    warmInitialViews();
    boot();
});
