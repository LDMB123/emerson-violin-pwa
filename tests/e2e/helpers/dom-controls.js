export const setInputValue = async (locator, value) => {
    await locator.evaluate((input, nextValue) => {
        input.value = String(nextValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
};

export const setCheckboxValue = async (locator, checked) => {
    await locator.evaluate((input, nextChecked) => {
        input.checked = Boolean(nextChecked);
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }, checked);
};
