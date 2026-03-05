/**
 * Runs a synchronous operation and returns a boolean-style success value.
 * Thrown errors are swallowed and replaced with the provided fallback.
 *
 * @param {() => unknown} operation
 * @param {boolean} [fallback=false]
 * @returns {boolean}
 */
export const tryRun = (operation, fallback = false) => {
    try {
        operation();
        return true;
    } catch {
        return fallback;
    }
};

/**
 * Runs an operation inside a Promise chain and normalizes failure to a fallback.
 * Rejections and thrown errors are swallowed and replaced with the provided fallback.
 *
 * @param {() => Promise<unknown> | unknown} operation
 * @param {boolean} [fallback=false]
 * @returns {Promise<boolean>}
 */
export const tryRunAsync = async (operation, fallback = false) => {
    return Promise.resolve()
        .then(() => operation())
        .then(() => true)
        .catch(() => fallback);
};
