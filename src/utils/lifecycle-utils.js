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
