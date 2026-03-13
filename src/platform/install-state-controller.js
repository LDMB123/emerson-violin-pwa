import {
    getAppleInstallSurface,
    isStandalone,
} from './platform-utils.js';
import { INSTALL_PROMPT_CHANGE_EVENT, canPromptInstall } from './install-prompt.js';
import { addMediaQueryListener } from '../utils/media-query-listener.js';

/**
 * Creates the controller that keeps install status UI in sync with app state.
 *
 * @returns {{
 *   setElement: (element: HTMLElement | null | undefined) => void,
 *   bind: (storageController: { updateStorageStatus: (installed: boolean) => void, maybeAutoPersist: (reason: string) => void }) => void,
 *   update: (storageController: { updateStorageStatus: (installed: boolean) => void, maybeAutoPersist: (reason: string) => void }) => void
 * }}
 */
export const createInstallStateController = () => {
    let installStatusEl = null;
    let installGlobalsBound = false;

    const describeInstallStatus = (surface) => {
        if (surface === 'iphone' || surface === 'ipad') {
            return 'Install status: In Safari, choose Add to Home Screen, then turn on Open as Web App when Safari offers it.';
        }
        if (surface === 'mac') {
            return 'Install status: In Safari on Mac, choose File > Add to Dock for the installed app window.';
        }
        return 'Install status: Install prompt unavailable. Use browser install controls if available.';
    };

    const update = (storageController) => {
        const standalone = isStandalone();
        const installSurface = getAppleInstallSurface();
        if (document.documentElement) {
            document.documentElement.dataset.installed = standalone ? 'true' : 'false';
        }

        if (installStatusEl) {
            if (standalone) {
                installStatusEl.textContent = installSurface === 'mac'
                    ? 'Install status: Installed as a Safari web app window.'
                    : 'Install status: Installed on Home Screen.';
            } else if (canPromptInstall()) {
                installStatusEl.textContent = 'Install status: Ready. Use the Install button in the app prompt.';
            } else {
                installStatusEl.textContent = describeInstallStatus(installSurface);
            }
        }

        if (standalone) {
            storageController.updateStorageStatus(true);
            storageController.maybeAutoPersist('installed');
        }
    };

    const bind = (storageController) => {
        update(storageController);
        if (installGlobalsBound) return;
        installGlobalsBound = true;
        window.addEventListener('appinstalled', () => update(storageController));
        addMediaQueryListener(
            window.matchMedia('(display-mode: standalone)'),
            () => update(storageController)
        );
        document.addEventListener(INSTALL_PROMPT_CHANGE_EVENT, () => update(storageController));
    };

    return {
        setElement(element) {
            installStatusEl = element || null;
        },
        bind,
        update,
    };
};
