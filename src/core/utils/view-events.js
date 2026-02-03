export const getViewId = (explicit) => explicit || window.location.hash?.replace('#', '') || 'view-home';

export const onViewChange = (handler, {
    immediate = false,
    includeHash = true,
    includePanda = true,
    dedupe = true,
    dedupeWindowMs = 120,
} = {}) => {
    if (typeof handler !== 'function') return () => {};
    let lastViewId = null;
    let lastAt = 0;
    const run = (explicit) => {
        const viewId = getViewId(explicit);
        if (dedupe) {
            const now = performance?.now ? performance.now() : Date.now();
            if (viewId === lastViewId && now - lastAt < dedupeWindowMs) return;
            lastViewId = viewId;
            lastAt = now;
        }
        handler(viewId);
    };
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
