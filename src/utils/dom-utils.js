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

/**
 * Returns the matching child div or creates it when missing.
 *
 * @param {Element} parent
 * @param {string} className
 * @returns {HTMLDivElement}
 */
export const ensureChildDiv = (parent, className) => {
    let el = parent.querySelector(`.${className}`);
    if (el) return el;
    el = document.createElement('div');
    el.className = className;
    parent.appendChild(el);
    return el;
};

/**
 * Sets or clears `aria-current`.
 *
 * @param {Element} el
 * @param {boolean} active
 * @param {string} [value='page']
 * @returns {void}
 */
export const setAriaCurrent = (el, active, value = 'page') => {
    if (active) {
        el.setAttribute('aria-current', value);
    } else {
        el.removeAttribute('aria-current');
    }
};

/**
 * Sets `aria-pressed` from a boolean value.
 *
 * @param {Element} el
 * @param {boolean} pressed
 * @returns {void}
 */
export const setAriaPressed = (el, pressed) => {
    el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
};

/**
 * Updates progressbar ARIA values.
 *
 * @param {Element} el
 * @param {number | string} value
 * @param {number | string | undefined} text
 * @returns {void}
 */
export const updateProgressAttribute = (el, value, text) => {
    el.setAttribute('aria-valuenow', String(value));
    if (text !== undefined) el.setAttribute('aria-valuetext', String(text));
};

/**
 * Sets `aria-hidden` when the element exists.
 *
 * @param {Element | null | undefined} el
 * @param {boolean} hidden
 * @returns {void}
 */
export const setAriaHidden = (el, hidden) => {
    if (el) el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
};

/**
 * Sets the `hidden` property when the element exists.
 *
 * @param {HTMLElement | null | undefined} el
 * @param {boolean} hidden
 * @returns {void}
 */
export const setHidden = (el, hidden) => {
    if (el) el.hidden = hidden;
};

/**
 * Sets the `disabled` property when the element exists.
 *
 * @param {{ disabled: boolean } | null | undefined} el
 * @param {boolean} disabled
 * @returns {void}
 */
export const setDisabled = (el, disabled) => {
    if (el) el.disabled = disabled;
};

/**
 * Sets `textContent` when the element exists.
 *
 * @param {Node | null | undefined} el
 * @param {string} value
 * @returns {void}
 */
export const setTextContent = (el, value) => {
    if (el) el.textContent = value;
};

/**
 * Creates a setter that resolves its target element lazily.
 *
 * @param {() => (Node | null | undefined)} resolveElement
 * @returns {(value: string) => void}
 */
export const createTextContentSetter = (resolveElement) => (value) => {
    setTextContent(resolveElement(), value);
};

/**
 * Toggles a playback class based on an audio element's paused state.
 *
 * @param {Object} [options={}]
 * @param {Element | null | undefined} [options.element]
 * @param {HTMLMediaElement | null | undefined} [options.audio]
 * @param {string} [options.className='is-playing']
 * @returns {void}
 */
export const syncAudioPlaybackClass = ({
    element,
    audio,
    className = 'is-playing',
} = {}) => {
    if (!element || !audio) return;
    element.classList.toggle(className, !audio.paused);
};

/**
 * Returns a checkbox input target, optionally requiring it to be checked.
 *
 * @param {EventTarget | null | undefined} target
 * @param {Object} [options={}]
 * @param {boolean} [options.requireChecked=false]
 * @returns {HTMLInputElement | null}
 */
export const getCheckboxInput = (target, { requireChecked = false } = {}) => {
    if (!(target instanceof HTMLInputElement)) return null;
    if (target.type !== 'checkbox') return null;
    if (requireChecked && !target.checked) return null;
    return target;
};

/**
 * Returns an input target when it matches the requested id or selector.
 *
 * @param {EventTarget | null | undefined} target
 * @param {Object} [options={}]
 * @param {string | undefined} [options.id]
 * @param {string | undefined} [options.selector]
 * @returns {HTMLInputElement | null}
 */
export const getMatchingInputTarget = (target, { id, selector } = {}) => {
    if (!(target instanceof HTMLInputElement)) return null;
    if (id && target.id === id) return target;
    if (selector && target.matches(selector)) return target;
    return null;
};
