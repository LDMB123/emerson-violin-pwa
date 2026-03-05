/**
 * Utilities for constructing and parsing view hash strings.
 * Format: #view-game-{id} | #view-song-{id}
 */

/**
 * Builds the hash for a game view.
 *
 * @param {string} id
 * @returns {string}
 */
export const gameViewHash = (id) => `#view-game-${id}`;

/**
 * Builds the hash for a song view.
 *
 * @param {string} id
 * @returns {string}
 */
export const songViewHash = (id) => `#view-song-${id}`;

/**
 * Returns whether a hash matches the expected game view hash.
 *
 * @param {string} hash
 * @param {string} id
 * @returns {boolean}
 */
export const isGameView = (hash, id) => hash === gameViewHash(id);
