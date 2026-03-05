/** Returns whether an active timer should block a full game reset. */
export const shouldSkipResetForActiveTimer = (gameState) => Boolean(gameState?._timerId);
