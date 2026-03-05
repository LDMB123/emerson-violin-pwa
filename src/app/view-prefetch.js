export const prefetchViewIfMissing = ({ viewId, getViewPath, viewLoader }) => {
    const viewPath = getViewPath(viewId);
    if (!viewLoader.has(viewPath)) {
        viewLoader.prefetch(viewPath);
    }
};
