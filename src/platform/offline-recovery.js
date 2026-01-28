const SW_PATH = './sw.js';
const IPADOS_UA = /iPad/;
const isIPadOS = IPADOS_UA.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const MIN_REFRESH_INTERVAL = isIPadOS ? 3 * 60 * 1000 : 10 * 60 * 1000;
let lastRefresh = 0;

const waitForLoad = () => new Promise((resolve) => {
    if (document.readyState === 'complete') {
        resolve();
        return;
    }
    window.addEventListener('load', () => resolve(), { once: true });
});

const ensureRegistration = async () => {
    if (!('serviceWorker' in navigator)) return null;
    await waitForLoad();
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    try {
        return await navigator.serviceWorker.register(SW_PATH);
    } catch {
        return null;
    }
};

const refreshAssets = async (reason) => {
    if (!('serviceWorker' in navigator)) return;
    const now = Date.now();
    if (now - lastRefresh < MIN_REFRESH_INTERVAL) return;
    lastRefresh = now;

    const registration = await ensureRegistration();
    if (!registration) return;

    if (navigator.onLine) {
        try {
            await registration.update();
        } catch {
            // Ignore update errors
        }
    }

    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'REFRESH_ASSETS',
            reason,
        });
    }
};

const bindLifecycleRefresh = () => {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refreshAssets('visible');
        }
    });

    window.addEventListener('online', () => {
        refreshAssets('online');
    });

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            refreshAssets('pageshow');
        }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        lastRefresh = 0;
        refreshAssets('controllerchange');
    }, { once: true });
};

const init = () => {
    if (!('serviceWorker' in navigator)) return;
    bindLifecycleRefresh();
    refreshAssets('boot');
};

init();
