import { INSTALL_GUIDE_KEY as DISMISS_KEY } from '../persistence/storage-keys.js';
import { isIPadOS, isStandalone, isAutomated, setRootDataset } from './platform-utils.js';
import { markDismissed, wasDismissed } from './dismiss-helpers.js';

let helpButton = null;
let lastFocused = null;

const resolveElements = () => {
    helpButton = document.querySelector('[data-install-help]');
};

const buildGuide = () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'install-guide-backdrop';
    backdrop.setAttribute('role', 'presentation');

    const panel = document.createElement('div');
    panel.className = 'install-guide glass';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'install-guide-title');

    const title = document.createElement('h3');
    title.id = 'install-guide-title';
    title.textContent = 'Install Panda Violin';

    const desc = document.createElement('p');
    desc.textContent = 'For the best offline experience on iPad:';

    const steps = document.createElement('ol');
    const step1 = document.createElement('li');
    step1.append('Open Safari\u2019s ');
    const chip = document.createElement('span');
    chip.className = 'install-guide-chip';
    chip.textContent = 'Share';
    step1.append(chip, ' menu.');

    const step2 = document.createElement('li');
    step2.append('Select ');
    const bold = document.createElement('strong');
    bold.textContent = 'Add to Home Screen';
    step2.append(bold, '.');

    const step3 = document.createElement('li');
    step3.textContent = 'Launch Panda Violin from your Home Screen.';

    steps.append(step1, step2, step3);

    const actions = document.createElement('div');
    actions.className = 'install-guide-actions';
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn btn-primary';
    dismissBtn.type = 'button';
    dismissBtn.dataset.installDismiss = '';
    dismissBtn.textContent = 'Got it';
    const laterBtn = document.createElement('button');
    laterBtn.className = 'btn btn-secondary';
    laterBtn.type = 'button';
    laterBtn.dataset.installLater = '';
    laterBtn.textContent = 'Later';
    actions.append(dismissBtn, laterBtn);

    panel.append(title, desc, steps, actions);

    backdrop.appendChild(panel);

    const dismiss = async (persist) => {
        if (persist) {
            await markDismissed(DISMISS_KEY);
        }
        backdrop.remove();
        document.documentElement.classList.remove('install-guide-open');
        if (lastFocused instanceof HTMLElement) {
            lastFocused.focus();
        }
    };

    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) {
            dismiss(false);
        }
    });

    panel.querySelector('[data-install-dismiss]')?.addEventListener('click', () => {
        dismiss(true);
    });

    panel.querySelector('[data-install-later]')?.addEventListener('click', () => {
        dismiss(false);
    });

    panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            dismiss(false);
            return;
        }
        if (event.key !== 'Tab') return;
        const focusables = Array.from(panel.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])'));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    });

    return backdrop;
};

const showGuide = async (force = false) => {
    if (isAutomated()) return;
    if (!isIPadOS()) {
        if (helpButton) helpButton.hidden = true;
        return;
    }

    if (isStandalone() && !force) {
        if (helpButton) helpButton.hidden = true;
        return;
    }

    if (!force && await wasDismissed(DISMISS_KEY)) return;
    if (document.querySelector('.install-guide-backdrop')) return;

    lastFocused = document.activeElement;
    const guide = buildGuide();
    document.body.appendChild(guide);
    document.documentElement.classList.add('install-guide-open');
    requestAnimationFrame(() => {
        guide.querySelector('[data-install-dismiss]')?.focus();
    });
};

const initInstallGuide = () => {
    resolveElements();
    if (isAutomated()) {
        if (helpButton) helpButton.hidden = true;
        return;
    }
    if (!isIPadOS()) {
        if (helpButton) helpButton.hidden = true;
        return;
    }

    setRootDataset('platform', 'ipados');

    if (helpButton && helpButton.dataset.installGuideBound !== 'true') {
        helpButton.dataset.installGuideBound = 'true';
        helpButton.addEventListener('click', () => {
            showGuide(true);
        });
    }

    showGuide(false);
};

export const openInstallGuide = () => showGuide(true);

export const init = initInstallGuide;
