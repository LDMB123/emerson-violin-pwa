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

export const seedInlineInitialViewCache = ({ viewLoader, getViewPath }) => {
    const inlineInitialView = getInlineInitialView();
    if (!inlineInitialView) return;
    try {
        viewLoader.seed(getViewPath(inlineInitialView.viewId), inlineInitialView.html);
    } catch {
        // Ignore invalid route metadata.
    }
};

export const warmInitialViews = ({
    getCurrentViewId,
    viewLoader,
    getViewPath,
}) => {
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
