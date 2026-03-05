/** Prefetches a view fragment when it is not already present in the loader cache. */
export const prefetchViewIfMissing = ({ viewId, getViewPath, viewLoader }) => {
    const viewPath = getViewPath(viewId);
    if (!viewLoader.has(viewPath)) {
        viewLoader.prefetch(viewPath);
    }
};
