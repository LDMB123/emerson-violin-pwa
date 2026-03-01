/**
 * Utilities for constructing and parsing view hash strings.
 * Format: #view-game-{id} | #view-song-{id}
 */

export const gameViewHash = (id) => `#view-game-${id}`;
export const songViewHash = (id) => `#view-song-${id}`;

export const isGameView = (hash, id) => hash === gameViewHash(id);
