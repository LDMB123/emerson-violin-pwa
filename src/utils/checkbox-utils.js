/**
 * Marks a checkbox as checked and dispatches a change event when needed.
 *
 * @param {EventTarget | null | undefined} input
 * @returns {boolean}
 */
export const markCheckboxInputChecked = (input) => {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.checked) return false;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
};
