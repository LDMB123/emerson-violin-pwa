/**
 * Adds a media-query change listener with legacy Safari fallback support.
 *
 * @param {MediaQueryList | null | undefined} mediaQueryList
 * @param {(event: MediaQueryListEvent | MediaQueryList) => void} handler
 * @returns {() => void} Cleanup function.
 */
export const addMediaQueryListener = (mediaQueryList, handler) => {
    if (!mediaQueryList || typeof handler !== 'function') {
        return () => {};
    }

    if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', handler);
        return () => {
            mediaQueryList.removeEventListener?.('change', handler);
        };
    }

    if (typeof mediaQueryList.addListener === 'function') {
        mediaQueryList.addListener(handler);
        return () => {
            mediaQueryList.removeListener?.(handler);
        };
    }

    return () => {};
};
