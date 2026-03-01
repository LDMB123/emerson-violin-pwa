/**
 * Extract the best available score from a practice event.
 * Prefers accuracy if finite, falls back to score.
 */
export const eventScore = (event) =>
  Number.isFinite(event?.accuracy) ? event.accuracy : event.score;
