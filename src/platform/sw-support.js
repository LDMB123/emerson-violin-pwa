const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

const isLocalhostHost = (hostname = '') => {
    if (!hostname) return false;
    if (LOCALHOST_NAMES.has(hostname)) return true;
    return hostname.endsWith('.local');
};

/**
 * Returns true when the runtime exposes the Service Worker API.
 *
 * @param {Navigator | undefined | null} [nav=navigator]
 * @returns {boolean}
 */
export const hasServiceWorkerSupport = (nav = navigator) => Boolean(nav?.serviceWorker);

/**
 * Returns true when Service Worker registration is allowed in the current context.
 * Non-secure contexts are allowed only for localhost-style development hosts.
 *
 * @param {Navigator | undefined | null} [nav=navigator]
 * @param {Location | { hostname?: string } | undefined | null} [locationLike=window.location]
 * @param {boolean} [isSecureContextLike=window.isSecureContext]
 * @returns {boolean}
 */
export const canRegisterServiceWorker = (
    nav = navigator,
    locationLike = window.location,
    isSecureContextLike = window.isSecureContext
) => {
    if (!hasServiceWorkerSupport(nav)) return false;
    if (isSecureContextLike) return true;
    return isLocalhostHost(locationLike?.hostname || '');
};
