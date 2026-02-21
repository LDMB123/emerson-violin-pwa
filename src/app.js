import { whenReady } from './utils/dom-ready.js';
import {
    getViewId,
    getModulesForView,
    getActiveNavHref,
    isNavItemActive,
    toMissionCheckpointHref,
} from './utils/app-utils.js';
import { isAudioAssetPath, prepareAudioElementSource } from './audio/format-detection.js';
import { ViewLoader } from './views/view-loader.js';
import { getRouteMeta, getViewPath } from './views/view-paths.js';
import { showViewError } from './views/view-error.js';
import {
    MODULE_LOADERS as moduleLoaders,
    EAGER_MODULES,
    IDLE_MODULE_PLAN,
    PREFETCH_VIEW_IDS,
} from './app/module-registry.js';
import { createAsyncGate } from './app/async-gate.js';
import {
    setupNavigationController,
    bindHashViewController,
    prefetchLikelyViews,
} from './app/navigation-controller.js';
import { bindGameSort } from './app/game-sort-controller.js';
import { createHomeCoachController } from './app/home-coach-controller.js';
import {
    bindInteractiveLabelKeys,
    prepareInteractiveLabels,
    setupPopoverSystem,
} from './app/ui-interactions.js';
import { registerAppServiceWorker } from './app/service-worker-bootstrap.js';
import {
    resolveInitialView,
    seedInlineInitialViewCache,
    warmInitialViews,
} from './app/view-bootstrap.js';

const viewLoader = new ViewLoader();
const viewRenderGate = createAsyncGate();
const PREFETCH_LIMIT = 3;
const homeCoachController = createHomeCoachController({
    getViewId,
    getRouteMeta,
    toMissionCheckpointHref,
});

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
        homeCoachController.updatePracticeContinueCheckpoint(viewId);
        homeCoachController.bindChildHomeActions(container);
        bindGameSort(container);
        homeCoachController.bindCoachStepper(container);
    } catch (err) {
        if (!viewRenderGate.isActive(renderToken)) return;
        console.error('[App] View load failed:', err);
        showViewError('Failed to load view. Please check your connection and try again.');
    }
};

const rewriteAudioSources = (root = document) => {
    const audioElements = root.querySelectorAll('audio[src]');
    audioElements.forEach((audio) => {
        const currentSrc = audio.getAttribute('src');
        if (!isAudioAssetPath(currentSrc)) return;
        prepareAudioElementSource(audio, currentSrc);
    });
};

const loadEagerModules = () => {
    EAGER_MODULES.forEach((key) => loadModule(key));
};

const loadIdleModules = () => {
    IDLE_MODULE_PLAN.forEach(([key, delay]) => loadIdle(key, delay));
};

const boot = async () => {
    const initialViewId = await resolveInitialView(getCurrentViewId);
    await showView(initialViewId);

    const ctx = {
        navItems: Array.from(document.querySelectorAll('.bottom-nav .nav-item[href^="#view-"]')),
        prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        lastPopoverTrigger: null,
        bindPopovers: null,
        updateNavState: null,
    };

    registerAppServiceWorker();
    setupNavigationController({
        ctx,
        getCurrentViewId,
        getActiveNavHref,
        isNavItemActive,
    });
    setupPopoverSystem(ctx);
    bindInteractiveLabelKeys();
    loadEagerModules();
    loadIdleModules();
    prefetchLikelyViews({
        currentViewId: initialViewId,
        prefetchViewIds: PREFETCH_VIEW_IDS,
        prefetchLimit: PREFETCH_LIMIT,
        queueIdleTask,
        getViewPath,
        viewLoader,
    });

    const hashViewController = bindHashViewController({
        getCurrentViewId,
        showView: (viewId) => showView(viewId, ctx),
        onAfterViewChange: () => {
            ctx.updateNavState?.();
        },
    });
    await hashViewController.syncInitialView(initialViewId);

    window.__PANDA_APP_READY__ = true;
};

whenReady(() => {
    seedInlineInitialViewCache({ viewLoader, getViewPath });
    warmInitialViews({
        getCurrentViewId,
        viewLoader,
        getViewPath,
    });
    boot();
});
