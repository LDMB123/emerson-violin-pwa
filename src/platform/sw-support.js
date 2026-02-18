const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

const isLocalhostHost = (hostname = '') => {
    if (!hostname) return false;
    if (LOCALHOST_NAMES.has(hostname)) return true;
    return hostname.endsWith('.local');
};

export const hasServiceWorkerSupport = (nav = navigator) => Boolean(nav?.serviceWorker);

export const canRegisterServiceWorker = (
    nav = navigator,
    locationLike = window.location,
    isSecureContextLike = window.isSecureContext
) => {
    if (!hasServiceWorkerSupport(nav)) return false;
    if (isSecureContextLike) return true;
    return isLocalhostHost(locationLike?.hostname || '');
};
