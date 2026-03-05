/**
 * Utility functions for shared DOM manipulations.
 */

/**
 * Updates the `--slider-fill` CSS variable on a range input
 * based on its current value, min, and max attributes.
 * Allows CSS backgrounds to sync with the thumb position.
 * 
 * @param {HTMLInputElement} slider - The `<input type="range">` element.
 */
export const updateSliderFill = (slider) => {
    if (!slider) return;
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    const val = Number(slider.value) || 0;
    // Prevent division by zero if max === min
    const range = max - min;
    const pct = range === 0 ? 0 : ((val - min) / range) * 100;
    slider.style.setProperty('--slider-fill', `${pct}%`);
};

export const ensureChildDiv = (parent, className) => {
    let el = parent.querySelector(`.${className}`);
    if (el) return el;
    el = document.createElement('div');
    el.className = className;
    parent.appendChild(el);
    return el;
};

export const setAriaCurrent = (el, active, value = 'page') => {
    if (active) {
        el.setAttribute('aria-current', value);
    } else {
        el.removeAttribute('aria-current');
    }
};

export const setAriaPressed = (el, pressed) => {
    el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
};

export const updateProgressAttribute = (el, value, text) => {
    el.setAttribute('aria-valuenow', String(value));
    if (text !== undefined) el.setAttribute('aria-valuetext', String(text));
};

export const setAriaHidden = (el, hidden) => {
    if (el) el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
};

export const setHidden = (el, hidden) => {
    if (el) el.hidden = hidden;
};

export const setDisabled = (el, disabled) => {
    if (el) el.disabled = disabled;
};

export const setTextContent = (el, value) => {
    if (el) el.textContent = value;
};

export const getCheckboxInput = (target, { requireChecked = false } = {}) => {
    if (!(target instanceof HTMLInputElement)) return null;
    if (target.type !== 'checkbox') return null;
    if (requireChecked && !target.checked) return null;
    return target;
};

export const getMatchingInputTarget = (target, { id, selector } = {}) => {
    if (!(target instanceof HTMLInputElement)) return null;
    if (id && target.id === id) return target;
    if (selector && target.matches(selector)) return target;
    return null;
};
