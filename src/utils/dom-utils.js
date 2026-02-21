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
