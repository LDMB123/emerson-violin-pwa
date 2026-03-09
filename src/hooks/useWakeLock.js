import { useEffect, useRef } from 'react';

/**
 * Automatically requests a screen wake lock when the component mounts,
 * and handles re-requesting it if the page becomes visible again after being hidden.
 * Safely degrades on unsupported browsers.
 *
 * @param {boolean} [shouldLock=true] - Whether the lock should currently be active.
 */
export function useWakeLock(shouldLock = true) {
    const lockRef = useRef(null);

    useEffect(() => {
        if (!shouldLock) {
            if (lockRef.current) {
                lockRef.current.release().catch(() => { });
                lockRef.current = null;
            }
            return;
        }

        let mounted = true;

        const acquireWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && mounted) {
                    lockRef.current = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                // Graceful degradation for low battery or unsupported contexts
                console.warn('Wake Lock request failed:', err);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && shouldLock) {
                acquireWakeLock();
            }
        };

        // Initial acquisition
        acquireWakeLock();

        // Re-acquire when returning to tab
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            mounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (lockRef.current) {
                lockRef.current.release().catch(() => { });
                lockRef.current = null;
            }
        };
    }, [shouldLock]);
}
