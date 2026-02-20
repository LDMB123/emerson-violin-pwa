const FOREGROUND_REFRESH_MIN_INTERVAL = 5 * 60 * 1000;

export const createSwRefreshController = ({ setSyncStatus }) => {
    let foregroundFallbackBound = false;
    let lastForegroundRefreshAt = 0;

    const canRunForegroundRefresh = () => {
        if (!navigator.onLine) return false;
        const elapsed = Date.now() - lastForegroundRefreshAt;
        return elapsed >= FOREGROUND_REFRESH_MIN_INTERVAL;
    };

    const requestForegroundRefresh = async (registration, reason = 'foreground') => {
        if (!registration?.active) return false;
        if (!canRunForegroundRefresh()) return false;
        try {
            registration.active.postMessage({ type: 'REFRESH_ASSETS' });
            lastForegroundRefreshAt = Date.now();
            setSyncStatus(`Foreground refresh queued (${reason}).`);
            return true;
        } catch {
            setSyncStatus('Foreground refresh unavailable right now.');
            return false;
        }
    };

    const bindForegroundRefreshFallback = (registration) => {
        if (foregroundFallbackBound) return;
        if (!registration) return;
        foregroundFallbackBound = true;

        const triggerOnVisible = () => {
            if (document.visibilityState !== 'visible') return;
            requestForegroundRefresh(registration, 'visible').catch(() => {});
        };
        const triggerOnOnline = () => {
            requestForegroundRefresh(registration, 'online').catch(() => {});
        };

        document.addEventListener('visibilitychange', triggerOnVisible);
        window.addEventListener('online', triggerOnOnline);
        window.addEventListener('focus', triggerOnVisible);
        setSyncStatus('Foreground refresh fallback enabled (reconnect/open).');
    };

    const registerBackgroundRefresh = async (registration) => {
        if (!registration) return;
        if ('periodicSync' in registration) {
            try {
                await registration.periodicSync.register('panda-refresh', {
                    minInterval: 24 * 60 * 60 * 1000,
                });
                setSyncStatus('Background refresh enabled.');
                return;
            } catch {
                // Continue to one-shot sync or foreground fallback.
            }
        }

        if ('sync' in registration) {
            try {
                await registration.sync.register('panda-refresh');
                setSyncStatus('Background refresh queued for next online session.');
                return;
            } catch {
                // Continue to foreground fallback.
            }
        }

        bindForegroundRefreshFallback(registration);
        requestForegroundRefresh(registration, 'startup').catch(() => {});
    };

    return {
        registerBackgroundRefresh,
    };
};
