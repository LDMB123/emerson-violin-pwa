import { canRegisterServiceWorker } from '../platform/sw-support.js';

const SW_CACHE_PREFIXES = ['panda-violin-', 'workbox-'];
const DEV_SW_RESET_FLAG = 'panda-violin-dev-sw-reset';

const onWindowLoad = (callback) => {
    if (document.readyState === 'complete') {
        callback();
        return;
    }
    window.addEventListener('load', callback, { once: true });
};

const cleanupDevServiceWorkers = async () => {
    if (!('serviceWorker' in navigator)) return;

    const wasControlled = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
        const keys = await caches.keys();
        const appKeys = keys.filter((key) => SW_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)));
        await Promise.all(appKeys.map((key) => caches.delete(key)));
    }

    if (wasControlled) {
        const alreadyReloaded = window.sessionStorage.getItem(DEV_SW_RESET_FLAG) === '1';
        if (!alreadyReloaded) {
            window.sessionStorage.setItem(DEV_SW_RESET_FLAG, '1');
            window.location.reload();
        }
        return;
    }

    window.sessionStorage.removeItem(DEV_SW_RESET_FLAG);
};

export const registerAppServiceWorker = () => {
    onWindowLoad(() => {
        if (!import.meta.env.PROD) {
            cleanupDevServiceWorkers().catch((err) => console.warn('[SW] dev cleanup failed', err));
            return;
        }
        if (!canRegisterServiceWorker()) return;
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((err) => console.warn('[SW] registration failed', err));
    });
};
