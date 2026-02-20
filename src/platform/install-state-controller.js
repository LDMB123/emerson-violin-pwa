import {
    isIPadOS,
    isStandalone,
} from './platform-utils.js';
import { INSTALL_PROMPT_CHANGE_EVENT, canPromptInstall } from './install-prompt.js';

export const createInstallStateController = () => {
    let installStatusEl = null;
    let installGlobalsBound = false;

    const update = (storageController) => {
        const standalone = isStandalone();
        if (document.documentElement) {
            document.documentElement.dataset.installed = standalone ? 'true' : 'false';
        }

        if (installStatusEl) {
            if (standalone) {
                installStatusEl.textContent = 'Install status: Installed on Home Screen.';
            } else if (canPromptInstall()) {
                installStatusEl.textContent = 'Install status: Ready. Use the Install button in the app prompt.';
            } else if (isIPadOS()) {
                installStatusEl.textContent = 'Install status: Use Add to Home Screen for the best offline experience.';
            } else {
                installStatusEl.textContent = 'Install status: Install prompt unavailable. Use browser install controls if available.';
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
        window.matchMedia('(display-mode: standalone)').addEventListener('change', () => update(storageController));
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
