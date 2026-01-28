import { getJSON, setJSON } from '../persistence/storage.js';

const DISMISS_KEY = 'panda-violin:install-guide:v1';
const helpButton = document.querySelector('[data-install-help]');
let lastFocused = null;

const isIPadOS = () => /iPad/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;

const markDismissed = async () => {
    await setJSON(DISMISS_KEY, { dismissed: true, timestamp: Date.now() });
};

const wasDismissed = async () => {
    const data = await getJSON(DISMISS_KEY);
    return Boolean(data?.dismissed);
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

    panel.innerHTML = `
      <h3 id="install-guide-title">Install Panda Violin</h3>
      <p>For the best offline experience on iPad:</p>
      <ol>
        <li>Open Safari&#39;s <span class="install-guide-chip">Share</span> menu.</li>
        <li>Select <strong>Add to Home Screen</strong>.</li>
        <li>Launch Panda Violin from your Home Screen.</li>
      </ol>
      <div class="install-guide-actions">
        <button class="btn btn-primary" type="button" data-install-dismiss>Got it</button>
        <button class="btn btn-secondary" type="button" data-install-later>Later</button>
      </div>
    `;

    backdrop.appendChild(panel);

    const dismiss = async (persist) => {
        if (persist) {
            await markDismissed();
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
    if (!isIPadOS()) {
        if (helpButton) helpButton.hidden = true;
        return;
    }

    if (isStandalone() && !force) {
        if (helpButton) helpButton.hidden = true;
        return;
    }

    if (!force && await wasDismissed()) return;
    if (document.querySelector('.install-guide-backdrop')) return;

    lastFocused = document.activeElement;
    const guide = buildGuide();
    document.body.appendChild(guide);
    document.documentElement.classList.add('install-guide-open');
    requestAnimationFrame(() => {
        guide.querySelector('[data-install-dismiss]')?.focus();
    });
};

const init = () => {
    if (!isIPadOS()) {
        if (helpButton) helpButton.hidden = true;
        return;
    }

    document.documentElement.dataset.platform = 'ipados';

    if (helpButton) {
        helpButton.addEventListener('click', () => {
            showGuide(true);
        });
    }

    showGuide(false);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
