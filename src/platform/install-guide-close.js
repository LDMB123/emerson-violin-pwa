let observer = null;

const enhanceExistingGuides = () => {
    document.querySelectorAll('.install-guide-backdrop').forEach((backdrop) => addCloseButton(backdrop));
};

const bindObserver = () => {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                const backdrop = node.classList?.contains('install-guide-backdrop')
                    ? node
                    : node.querySelector?.('.install-guide-backdrop');
                if (backdrop) {
                    addCloseButton(backdrop);
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
};

const addCloseButton = (backdrop) => {
    const panel = backdrop.querySelector('.install-guide');
    if (!panel) return;

    // Check if close button already exists
    if (panel.querySelector('.install-guide-close')) return;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'install-guide-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close install guide');
    closeBtn.innerHTML = '×';

    // Add click handler - dismiss without persisting
    closeBtn.addEventListener('click', () => {
        const laterBtn = panel.querySelector('[data-install-later]');
        if (laterBtn) {
            laterBtn.click(); // Trigger the existing "Later" logic
        }
    });

    // Insert as first child of panel
    panel.insertBefore(closeBtn, panel.firstChild);
};

const initInstallGuideClose = () => {
    enhanceExistingGuides();
    bindObserver();
};

export const init = initInstallGuideClose;
