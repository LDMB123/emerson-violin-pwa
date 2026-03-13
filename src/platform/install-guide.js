import { INSTALL_GUIDE_KEY as DISMISS_KEY } from '../persistence/storage-keys.js';
import { getAppleInstallSurface, isStandalone, isAutomated, setRootDataset } from './platform-utils.js';
import { markDismissed, wasDismissed } from './dismiss-helpers.js';
import { setHidden } from '../utils/dom-utils.js';

let helpButton = null;
let lastFocused = null;

const resolveElements = () => {
    helpButton = document.querySelector('[data-install-help]');
};

const resolveGuideContent = (surface) => {
    if (surface === 'iphone') {
        return {
            title: 'Install Panda Violin on iPhone',
            description: 'For the best offline experience in Safari on iPhone:',
            steps: [
                ['Open Safari’s ', 'Share', ' menu.'],
                ['Tap ', 'Add to Home Screen', '.'],
                ['Turn on ', 'Open as Web App', ' if Safari shows the option.'],
                ['Launch Panda Violin from your Home Screen.'],
            ],
        };
    }

    if (surface === 'mac') {
        return {
            title: 'Install Panda Violin on Mac',
            description: 'For the best desktop web-app experience in Safari on Mac:',
            steps: [
                ['Open Panda Violin in Safari.'],
                ['Choose ', 'File > Add to Dock', '.'],
                ['Launch Panda Violin from the Dock or Applications folder.'],
            ],
        };
    }

    return {
        title: 'Install Panda Violin on iPad',
        description: 'For the best offline experience in Safari on iPad:',
        steps: [
            ['Open Safari’s ', 'Share', ' menu.'],
            ['Tap ', 'Add to Home Screen', '.'],
            ['Turn on ', 'Open as Web App', ' if Safari shows the option.'],
            ['Launch Panda Violin from your Home Screen.'],
        ],
    };
};

const buildGuide = (surface) => {
    const content = resolveGuideContent(surface);
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
    title.textContent = content.title;

    const desc = document.createElement('p');
    desc.textContent = content.description;

    const steps = document.createElement('ol');
    content.steps.forEach((parts) => {
        const item = document.createElement('li');
        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                item.append(part);
                return;
            }

            const emphasis = surface === 'mac' && part.includes('Add to Dock')
                ? document.createElement('strong')
                : document.createElement('span');

            if (emphasis.tagName === 'SPAN') {
                emphasis.className = 'install-guide-chip';
            }
            emphasis.textContent = part;
            item.append(emphasis);
        });
        steps.appendChild(item);
    });

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

const hideHelpButtonIfUnsupported = (surface) => {
    if (surface !== 'other') return false;
    setHidden(helpButton, true);
    return true;
};

const showGuide = async (force = false) => {
    const surface = getAppleInstallSurface();
    if (isAutomated()) return;
    if (hideHelpButtonIfUnsupported(surface)) return;

    if (isStandalone() && !force) {
        setHidden(helpButton, true);
        return;
    }

    if (!force && await wasDismissed(DISMISS_KEY)) return;
    if (document.querySelector('.install-guide-backdrop')) return;

    lastFocused = document.activeElement;
    const guide = buildGuide(surface);
    document.body.appendChild(guide);
    document.documentElement.classList.add('install-guide-open');
    requestAnimationFrame(() => {
        guide.querySelector('[data-install-dismiss]')?.focus();
    });
};

const initInstallGuide = () => {
    resolveElements();
    const surface = getAppleInstallSurface();
    if (isAutomated()) {
        setHidden(helpButton, true);
        return;
    }
    if (hideHelpButtonIfUnsupported(surface)) return;

    setRootDataset('installSurface', surface);

    if (helpButton && helpButton.dataset.installGuideBound !== 'true') {
        helpButton.dataset.installGuideBound = 'true';
        helpButton.addEventListener('click', () => {
            showGuide(true);
        });
    }

    showGuide(false);
};

/**
 * Opens the install guide immediately.
 *
 * @returns {Promise<void>}
 */
export const openInstallGuide = () => showGuide(true);

/**
 * Initializes the install guide and help button.
 *
 * @returns {void}
 */
export const init = initInstallGuide;
