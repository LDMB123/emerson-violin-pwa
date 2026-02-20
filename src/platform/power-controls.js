import {
    viewAllowsWake,
    getPreferredOrientation,
} from './platform-utils.js';
import { getViewId } from '../utils/app-utils.js';

const createEmptyElements = () => ({
    wakeToggle: null,
    wakeStatusEl: null,
    orientationToggle: null,
    orientationStatusEl: null,
});

export const createPowerControls = () => {
    let elements = createEmptyElements();
    let wakeGlobalsBound = false;
    let orientationGlobalsBound = false;
    let wakeLock = null;
    let orientationLocked = false;

    const updateWakeStatus = (message) => {
        if (elements.wakeStatusEl) {
            elements.wakeStatusEl.textContent = message;
        }
    };

    const releaseWakeLock = async () => {
        if (!wakeLock) return;
        try {
            await wakeLock.release();
        } catch {
            // Ignore release errors
        }
        wakeLock = null;
    };

    const requestWakeLock = async () => {
        if (!elements.wakeToggle) return;
        if (!elements.wakeToggle.checked) {
            await releaseWakeLock();
            updateWakeStatus('Screen stays on during practice sessions.');
            return;
        }
        if (document.hidden) return;

        const viewId = getViewId(window.location.hash);
        if (!viewAllowsWake(viewId)) {
            await releaseWakeLock();
            updateWakeStatus('Enable this while practicing to keep the screen awake.');
            return;
        }

        try {
            wakeLock = await navigator.wakeLock.request('screen');
            updateWakeStatus('Screen will stay awake while you practice.');
            wakeLock.addEventListener('release', () => {
                if (elements.wakeToggle?.checked && !document.hidden) {
                    requestWakeLock();
                }
            });
        } catch {
            updateWakeStatus('Screen wake lock unavailable right now.');
        }
    };

    const bindWakeLock = () => {
        if (!elements.wakeToggle) return;

        if (elements.wakeToggle.dataset.nativeBound !== 'true') {
            elements.wakeToggle.dataset.nativeBound = 'true';
            elements.wakeToggle.addEventListener('change', requestWakeLock);
        }

        if (!wakeGlobalsBound) {
            wakeGlobalsBound = true;
            window.addEventListener('hashchange', requestWakeLock, { passive: true });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    releaseWakeLock();
                } else {
                    requestWakeLock();
                }
            });
            window.addEventListener('pagehide', () => {
                releaseWakeLock();
            });
        }

        requestWakeLock();
    };

    const updateOrientationStatus = (message) => {
        if (elements.orientationStatusEl) {
            elements.orientationStatusEl.textContent = message;
        }
    };

    const unlockOrientation = () => {
        if (screen.orientation?.unlock) {
            screen.orientation.unlock();
        }
        orientationLocked = false;
    };

    const requestOrientationLock = async () => {
        if (!elements.orientationToggle) return;
        if (!elements.orientationToggle.checked) {
            unlockOrientation();
            updateOrientationStatus('Orientation follows device settings.');
            return;
        }
        if (!screen.orientation?.lock) {
            updateOrientationStatus('Orientation lock not available on this device.');
            return;
        }
        if (document.hidden) return;

        const viewId = getViewId(window.location.hash);
        if (!viewAllowsWake(viewId)) {
            unlockOrientation();
            updateOrientationStatus('Enable this while practicing to keep the orientation fixed.');
            return;
        }

        try {
            await screen.orientation.lock(getPreferredOrientation());
            orientationLocked = true;
            updateOrientationStatus('Orientation locked for practice sessions.');
        } catch {
            updateOrientationStatus('Orientation lock unavailable right now. Use Control Center if needed.');
        }
    };

    const bindOrientationLock = () => {
        if (!elements.orientationToggle) return;

        if (elements.orientationToggle.dataset.nativeBound !== 'true') {
            elements.orientationToggle.dataset.nativeBound = 'true';
            elements.orientationToggle.addEventListener('change', requestOrientationLock);
        }

        if (!orientationGlobalsBound) {
            orientationGlobalsBound = true;
            window.addEventListener('hashchange', requestOrientationLock, { passive: true });
            window.addEventListener('orientationchange', () => {
                if (elements.orientationToggle?.checked && orientationLocked) {
                    requestOrientationLock();
                }
            }, { passive: true });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    unlockOrientation();
                } else {
                    requestOrientationLock();
                }
            });
            window.addEventListener('pagehide', () => {
                unlockOrientation();
            });
        }

        requestOrientationLock();
    };

    return {
        setElements(nextElements) {
            elements = {
                ...createEmptyElements(),
                ...nextElements,
            };
        },
        bindWakeLock,
        bindOrientationLock,
        requestWakeLock,
        requestOrientationLock,
    };
};
