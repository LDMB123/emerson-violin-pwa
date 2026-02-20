/**
 * Returns true when a pagehide event represents a bfcache snapshot.
 * @param {Event | { persisted?: boolean } | undefined | null} event
 * @returns {boolean}
 */
export const isBfcachePagehide = (event) => (
    Boolean(event && typeof event === 'object' && event.persisted === true)
);
