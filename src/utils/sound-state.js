/**
 * Returns whether app sound is currently enabled.
 *
 * @returns {boolean}
 */
export const isSoundEnabled = () => document.documentElement.dataset.sounds !== 'off';

/**
 * Returns true when an event detail indicates sound was disabled.
 *
 * @param {{ detail?: { enabled?: boolean } } | null | undefined} event
 * @returns {boolean}
 */
export const isSoundDisabledEvent = (event) => event?.detail?.enabled === false;

/**
 * Runs a callback when a sound-toggle event disabled audio.
 *
 * @param {{ detail?: { enabled?: boolean } } | null | undefined} event
 * @param {((event?: any) => void) | null | undefined} onDisabled
 * @returns {boolean}
 */
export const runIfSoundDisabled = (event, onDisabled) => {
    if (!isSoundDisabledEvent(event)) return false;
    if (typeof onDisabled === 'function') {
        onDisabled(event);
    }
    return true;
};

/**
 * Plays a source only when sound is enabled and a controller is available.
 *
 * @param {Object} [options={}]
 * @param {{ playSource?: (source: any) => Promise<void> }} [options.controller]
 * @param {any} [options.source]
 * @param {(() => void) | null} [options.beforePlay=null]
 * @returns {Promise<boolean>}
 */
export const playSourceWhenSoundEnabled = async ({
    controller,
    source,
    beforePlay = null,
} = {}) => {
    if (!source || typeof controller?.playSource !== 'function') return false;
    if (typeof beforePlay === 'function') {
        beforePlay();
    }
    if (!isSoundEnabled()) return false;
    await controller.playSource(source);
    return true;
};

/**
 * Resolves a value only when sound is enabled.
 *
 * @template T
 * @param {(() => T) | null | undefined} resolver
 * @returns {T | null}
 */
export const resolveSoundEnabledValue = (resolver) => {
    if (!isSoundEnabled() || typeof resolver !== 'function') return null;
    return resolver() || null;
};
