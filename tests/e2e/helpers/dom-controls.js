export const setInputValue = async (locator, value) => {
    await locator.evaluate((node, val) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        ).set;
        nativeInputValueSetter.call(node, val);
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(value));
};

export const setCheckboxValue = async (locator, checked) => {
    await locator.setChecked(Boolean(checked));
};
