/**
 * Returns true when a pagehide event represents a bfcache snapshot.
 * @param {Event | { persisted?: boolean } | undefined | null} event
 * @returns {boolean}
 */
export const isBfcachePagehide = (event) => (
    Boolean(event && typeof event === 'object' && event.persisted === true)
);

export const bindHiddenAndPagehide = ({
    onHidden,
    onPagehide = onHidden,
} = {}) => {
    const hiddenHandler = () => {
        if (!document.hidden) return;
        if (typeof onHidden === 'function') onHidden();
    };
    const pagehideHandler = (event) => {
        if (isBfcachePagehide(event)) return;
        if (typeof onPagehide === 'function') onPagehide(event);
    };
    document.addEventListener('visibilitychange', hiddenHandler);
    window.addEventListener('pagehide', pagehideHandler);
    return {
        hiddenHandler,
        pagehideHandler,
    };
};

export const bindVisibleVisibilityChange = (onVisible) => {
    const visibleHandler = () => {
        if (document.visibilityState !== 'visible') return;
        if (typeof onVisible === 'function') onVisible();
    };
    document.addEventListener('visibilitychange', visibleHandler);
    return visibleHandler;
};

export const createVisibilityListener = (handler) => {
    let isBound = false;

    const bind = () => {
        if (isBound || typeof handler !== 'function') return;
        document.addEventListener('visibilitychange', handler);
        isBound = true;
    };

    const unbind = () => {
        if (!isBound || typeof handler !== 'function') return;
        document.removeEventListener('visibilitychange', handler);
        isBound = false;
    };

    return {
        bind,
        unbind,
    };
};

export const createOnceBinder = () => {
    let isBound = false;
    return () => {
        if (isBound) return false;
        isBound = true;
        return true;
    };
};

export const runOnceBinding = (claimBinding, callback) => {
    if (typeof claimBinding !== 'function') return false;
    if (!claimBinding()) return false;
    if (typeof callback === 'function') callback();
    return true;
};
