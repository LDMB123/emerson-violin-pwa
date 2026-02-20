const INTERACTIVE_LABEL_SELECTOR = '.toggle-ui label[for], .song-controls label[for], .focus-controls label[for]';

let interactiveLabelKeysBound = false;

export const prepareInteractiveLabels = (root = document) => {
    root.querySelectorAll(INTERACTIVE_LABEL_SELECTOR).forEach((label) => {
        label.setAttribute('role', 'button');
        label.setAttribute('tabindex', '0');
    });
};

export const bindInteractiveLabelKeys = () => {
    if (interactiveLabelKeysBound) return;
    interactiveLabelKeysBound = true;
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (!(event.target instanceof HTMLLabelElement)) return;
        if (!event.target.matches(INTERACTIVE_LABEL_SELECTOR)) return;
        event.preventDefault();
        event.target.click();
    });
};

export const setupPopoverSystem = (ctx) => {
    const setPopoverExpanded = (popover, expanded) => {
        if (!popover?.id) return;
        document.querySelectorAll(`[popovertarget="${popover.id}"]`).forEach((button) => {
            button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    };

    const focusFirstPopoverItem = (popover) => {
        if (!popover) return;
        const target = popover.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (target instanceof HTMLElement) {
            target.focus();
        }
    };

    const bindPopovers = (root = document) => {
        root.querySelectorAll('[popover]').forEach((popover) => {
            if (popover.dataset.popoverBound === 'true') return;
            popover.dataset.popoverBound = 'true';
            setPopoverExpanded(popover, popover.matches(':popover-open'));
            popover.addEventListener('toggle', () => {
                const open = popover.matches(':popover-open');
                setPopoverExpanded(popover, open);
                if (open) {
                    focusFirstPopoverItem(popover);
                } else if (ctx.lastPopoverTrigger instanceof HTMLElement && ctx.lastPopoverTrigger.isConnected) {
                    ctx.lastPopoverTrigger.focus();
                }
            });
        });

        root.querySelectorAll('[popovertarget]').forEach((button) => {
            if (button.dataset.popoverTriggerBound === 'true') return;
            button.dataset.popoverTriggerBound = 'true';
            button.addEventListener('click', () => {
                ctx.lastPopoverTrigger = button;
            });
        });
    };

    ctx.bindPopovers = bindPopovers;
    bindPopovers(document);
};
