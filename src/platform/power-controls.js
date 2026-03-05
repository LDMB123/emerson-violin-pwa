import {
    viewAllowsWake,
    getPreferredOrientation,
} from './platform-utils.js';
import { getViewId } from '../utils/app-utils.js';
import { createControllerElements } from './controller-elements.js';

const createEmptyElements = () => ({
    wakeToggle: null,
    wakeStatusEl: null,
    orientationToggle: null,
    orientationStatusEl: null,
});

/**
 * Creates the wake-lock and orientation-lock controller set.
 *
 * @returns {{
 *   setElements: (nextElements: Partial<{ wakeToggle: HTMLInputElement | null, wakeStatusEl: HTMLElement | null, orientationToggle: HTMLInputElement | null, orientationStatusEl: HTMLElement | null }>) => any,
 *   bindWakeLock: () => void,
 *   bindOrientationLock: () => void,
 *   requestWakeLock: () => Promise<void>,
 *   requestOrientationLock: () => Promise<void>
 * }}
 */
export const createPowerControls = () => {
    const { elements, setElements } = createControllerElements(createEmptyElements);
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

    const withWakeEligibleView = async (onDenied = null) => {
        const viewId = getViewId(window.location.hash);
        if (viewAllowsWake(viewId)) return true;
        if (typeof onDenied === 'function') {
            await onDenied();
        }
        return false;
    };

    const canRequestPowerSetting = async (onDenied = null) => {
        if (document.hidden) return false;
        return withWakeEligibleView(onDenied);
    };

    const requestWakeLock = async () => {
        const shouldKeepAwake = Boolean(elements.wakeToggle?.checked);
        if (!shouldKeepAwake) {
            if (!elements.wakeToggle) return;
            await releaseWakeLock();
            updateWakeStatus('Screen stays on during practice sessions.');
            return;
        }
        if (!(await canRequestPowerSetting(async () => {
            await releaseWakeLock();
            updateWakeStatus('Enable this while practicing to keep the screen awake.');
        }))) return;

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
        const wakeToggle = elements.wakeToggle;
        if (!wakeToggle) return;

        if (wakeToggle.dataset.nativeBound !== 'true') {
            wakeToggle.dataset.nativeBound = 'true';
            wakeToggle.addEventListener('change', requestWakeLock);
        }

        const bindVisibilityHandlers = ({ onHidden, onVisible }) => {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    onHidden();
                } else {
                    onVisible();
                }
            });
            window.addEventListener('pagehide', () => {
                onHidden();
            });
        };

        if (!wakeGlobalsBound) {
            wakeGlobalsBound = true;
            window.addEventListener('hashchange', requestWakeLock, { passive: true });
            bindVisibilityHandlers({
                onHidden: () => {
                    void releaseWakeLock();
                },
                onVisible: () => {
                    void requestWakeLock();
                },
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
        if (!(await canRequestPowerSetting(() => {
            unlockOrientation();
            updateOrientationStatus('Enable this while practicing to keep the orientation fixed.');
        }))) return;

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
        const reapplyOrientationLock = () => {
            if (elements.orientationToggle?.checked && orientationLocked) {
                requestOrientationLock();
            }
        };

        if (elements.orientationToggle.dataset.nativeBound !== 'true') {
            elements.orientationToggle.dataset.nativeBound = 'true';
            elements.orientationToggle.addEventListener('change', requestOrientationLock);
        }

        if (!orientationGlobalsBound) {
            orientationGlobalsBound = true;
            window.addEventListener('hashchange', requestOrientationLock, { passive: true });
            if (screen.orientation) {
                screen.orientation.addEventListener('change', reapplyOrientationLock);
            } else {
                window.addEventListener('orientationchange', reapplyOrientationLock, { passive: true });
            }
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    unlockOrientation();
                    return;
                }
                void requestOrientationLock();
            });
            window.addEventListener('pagehide', () => {
                unlockOrientation();
            });
        }

        requestOrientationLock();
    };

    return {
        setElements,
        bindWakeLock,
        bindOrientationLock,
        requestWakeLock,
        requestOrientationLock,
    };
};
