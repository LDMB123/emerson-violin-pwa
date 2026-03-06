const REDUCED_DATA_QUERY = '(prefers-reduced-data: reduce)';

const prefersReducedData = () => {
    if (navigator.connection?.saveData === true) return true;
    if (typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(REDUCED_DATA_QUERY).matches === true;
};

/** Returns whether the app should spend network budget warming additional views. */
export const canPrefetchViews = () => {
    if (document.visibilityState === 'hidden') return false;
    return !prefersReducedData();
};

/** Prefetches a view fragment when it is not already present in the loader cache. */
export const prefetchViewIfMissing = ({ viewId, getViewPath, viewLoader }) => {
    const viewPath = getViewPath(viewId);
    if (!viewLoader.has(viewPath)) {
        viewLoader.prefetch(viewPath);
    }
};
