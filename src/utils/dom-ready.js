/**
 * Runs a callback immediately or once the DOM is ready.
 *
 * @param {() => void} fn
 * @returns {void}
 */
export const whenReady = (fn) => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
};
