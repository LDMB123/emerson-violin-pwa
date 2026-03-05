export const markCheckboxInputChecked = (input) => {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.checked) return false;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
};

