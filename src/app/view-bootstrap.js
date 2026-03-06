import { canPrefetchViews, prefetchViewIfMissing } from './view-prefetch.js';

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

/** Seeds the view loader cache from the server-rendered inline initial view markup. */
export const seedInlineInitialViewCache = ({ viewLoader, getViewPath }) => {
    const inlineInitialView = getInlineInitialView();
    if (!inlineInitialView) return;
    try {
        viewLoader.seed(getViewPath(inlineInitialView.viewId), inlineInitialView.html);
    } catch {
        // Ignore invalid route metadata.
    }
};

/** Prefetches the current initial view when data-saver mode is disabled. */
export const warmInitialViews = ({
    getCurrentViewId,
    viewLoader,
    getViewPath,
}) => {
    if (!canPrefetchViews()) return;

    const candidateIds = new Set();
    const currentViewId = getCurrentViewId();
    if (currentViewId?.startsWith('view-')) {
        candidateIds.add(currentViewId);
    }
    const inlineInitialView = getInlineInitialView();
    candidateIds.forEach((viewId) => {
        if (viewId === inlineInitialView?.viewId) return;
        try {
            prefetchViewIfMissing({ viewId, getViewPath, viewLoader });
        } catch {
            // Ignore invalid/unknown routes during warmup.
        }
    });
};

/** Resolves the first view to show, including onboarding redirect checks. */
export const resolveInitialView = async (getCurrentViewId) => {
    const hasExplicitHash = window.location.hash.startsWith('#view-');
    let initialViewId = getCurrentViewId() || 'view-home';
    if (!hasExplicitHash && initialViewId === 'view-home') {
        try {
            const { shouldShowOnboarding } = await import('../onboarding/onboarding-check.js');
            if (await shouldShowOnboarding()) {
                initialViewId = 'view-onboarding';
            }
        } catch {
            // Onboarding check failed - proceed to home
        }
    }
    return initialViewId;
};
