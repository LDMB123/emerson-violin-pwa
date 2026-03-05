/**
 * Returns true when a pagehide event represents a bfcache snapshot.
 * @param {Event | { persisted?: boolean } | undefined | null} event
 * @returns {boolean}
 */
export const isBfcachePagehide = (event) => (
    Boolean(event && typeof event === 'object' && event.persisted === true)
);

/**
 * Binds shared hidden/pagehide lifecycle callbacks.
 *
 * @param {Object} [options={}]
 * @param {(() => void) | undefined} [options.onHidden]
 * @param {((event?: Event) => void) | undefined} [options.onPagehide=onHidden]
 * @returns {{ hiddenHandler: () => void, pagehideHandler: (event?: Event) => void }}
 */
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

/**
 * Binds a callback that only runs when the page becomes visible.
 *
 * @param {(() => void) | undefined} onVisible
 * @returns {() => void}
 */
export const bindVisibleVisibilityChange = (onVisible) => {
    const visibleHandler = () => {
        if (document.visibilityState !== 'visible') return;
        if (typeof onVisible === 'function') onVisible();
    };
    document.addEventListener('visibilitychange', visibleHandler);
    return visibleHandler;
};

/**
 * Creates bind/unbind helpers for a visibilitychange listener.
 *
 * @param {EventListener | null | undefined} handler
 * @returns {{ bind: () => void, unbind: () => void }}
 */
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

/**
 * Creates a claim function that succeeds only once.
 *
 * @returns {() => boolean}
 */
export const createOnceBinder = () => {
    let isBound = false;
    return () => {
        if (isBound) return false;
        isBound = true;
        return true;
    };
};

/**
 * Runs a callback only when the supplied claim function succeeds.
 *
 * @param {(() => boolean) | null | undefined} claimBinding
 * @param {(() => void) | null | undefined} callback
 * @returns {boolean}
 */
export const runOnceBinding = (claimBinding, callback) => {
    if (typeof claimBinding !== 'function') return false;
    if (!claimBinding()) return false;
    if (typeof callback === 'function') callback();
    return true;
};
