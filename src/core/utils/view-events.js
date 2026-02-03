export const getViewId = (explicit) => explicit || window.location.hash?.replace('#', '') || 'view-home';

export const onViewChange = (handler, { immediate = false, includeHash = true, includePanda = true } = {}) => {
    if (typeof handler !== 'function') return () => {};
    const run = (explicit) => handler(getViewId(explicit));
    const handleHash = () => run();
    const handleEvent = (event) => run(event?.detail?.viewId);
    if (includeHash) {
        window.addEventListener('hashchange', handleHash, { passive: true });
    }
    if (includePanda) {
        document.addEventListener('panda:view-change', handleEvent, { passive: true });
    }
    if (immediate) run();
    return () => {
        if (includeHash) {
            window.removeEventListener('hashchange', handleHash);
        }
        if (includePanda) {
            document.removeEventListener('panda:view-change', handleEvent);
        }
    };
};
