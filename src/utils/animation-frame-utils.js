/**
 * Cancels a stored animation frame id and clears the slot.
 *
 * @param {Record<string, any> | null | undefined} target
 * @param {string} [key='rafId']
 * @returns {void}
 */
export const cancelAnimationFrameId = (target, key = 'rafId') => {
    if (!target) return;
    const rafId = target[key];
    if (rafId === null || rafId === undefined) return;
    cancelAnimationFrame(rafId);
    target[key] = null;
};
