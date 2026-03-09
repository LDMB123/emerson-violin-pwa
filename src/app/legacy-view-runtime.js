import { MODULE_LOADERS, resolveModulesForView } from './module-registry.js';
import { emitEvent, VIEW_RENDERED } from '../utils/event-names.js';

const moduleCache = new Map();
const INIT_RETRY_DELAYS_MS = [0, 120, 360, 900];

const loadModule = async (moduleId) => {
    if (moduleCache.has(moduleId)) {
        return moduleCache.get(moduleId);
    }

    const loader = MODULE_LOADERS[moduleId];
    if (typeof loader !== 'function') {
        return null;
    }

    const promise = loader().catch((error) => {
        moduleCache.delete(moduleId);
        console.warn(`[legacy-view-runtime] Failed to load module "${moduleId}"`, error);
        return null;
    });

    moduleCache.set(moduleId, promise);
    return promise;
};

const initModule = async (moduleId) => {
    const mod = await loadModule(moduleId);
    if (!mod || typeof mod.init !== 'function') {
        return;
    }

    try {
        await mod.init();
    } catch (error) {
        console.warn(`[legacy-view-runtime] Failed to init module "${moduleId}"`, error);
    }
};

const waitForViewElement = (viewId, { timeout = 2500 } = {}) => new Promise((resolve) => {
    const existing = document.getElementById(viewId);
    if (existing) {
        resolve(existing);
        return;
    }

    const root = document.getElementById('main-content');
    if (!root) {
        resolve(null);
        return;
    }

    const timeoutId = window.setTimeout(() => {
        observer.disconnect();
        resolve(document.getElementById(viewId));
    }, timeout);

    const observer = new MutationObserver(() => {
        const candidate = document.getElementById(viewId);
        if (!candidate) return;
        window.clearTimeout(timeoutId);
        observer.disconnect();
        resolve(candidate);
    });

    observer.observe(root, {
        childList: true,
        subtree: true,
    });
});

export const hydrateLegacyView = async (viewId, route) => {
    if (typeof viewId !== 'string' || !viewId) {
        return;
    }

    const view = await waitForViewElement(viewId);
    if (!view) {
        return;
    }

    const moduleIds = resolveModulesForView(viewId);
    for (const delayMs of INIT_RETRY_DELAYS_MS) {
        if (delayMs > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, delayMs));
        }

        if (!document.getElementById(viewId)) {
            return;
        }

        for (const moduleId of moduleIds) {
            await initModule(moduleId);
        }

        emitEvent(VIEW_RENDERED, {
            route,
            viewId,
        });
    }
};
