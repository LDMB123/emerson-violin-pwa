/**
 * Renders up to three next-action items into a list element.
 *
 * @param {HTMLElement | null | undefined} target
 * @param {Array<{ href?: string, label?: string, rationale?: string }>} actions
 * @param {string} [defaultLabel='Next action']
 * @param {string} [fallbackText='Complete one mission step to get next teaching actions.']
 * @returns {void}
 */
export const renderNextActionsList = (target, actions, defaultLabel = 'Next action', fallbackText = 'Complete one mission step to get next teaching actions.') => {
    if (!target) return;
    target.replaceChildren();
    if (!actions.length) {
        const fallback = document.createElement('li');
        fallback.textContent = fallbackText;
        target.appendChild(fallback);
        return;
    }
    actions.slice(0, 3).forEach((action) => {
        const item = document.createElement('li');
        if (action?.href) {
            const link = document.createElement('a');
            link.href = action.href;
            link.textContent = action.label || defaultLabel;
            item.appendChild(link);
        } else {
            item.textContent = action?.label || defaultLabel;
        }
        if (action?.rationale) {
            item.append(` — ${action.rationale}`);
        }
        target.appendChild(item);
    });
};
