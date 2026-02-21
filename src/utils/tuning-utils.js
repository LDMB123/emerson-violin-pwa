/**
 * Creates a reusable note hit detector for microphone input.
 * Handles debouncing and margin-of-error (cents) verification to 
 * ensure the player holds the correct note steadily before it registers as a hit.
 */
export function createTuningHitDetector(options = {}) {
    const {
        centsMargin = 20,
        debounceMs = 300
    } = options;

    let debounceStart = 0;
    let lastPlayedNote = null;

    /**
     * Checks if the currently heard note matches the target note steadily.
     * @param {Object} tuning - The parsed pitch detection object from the audio engine
     * @param {string} targetNote - The note we are looking for (e.g., 'A', 'D')
     * @returns {boolean} True if the note is a verified hit, false otherwise.
     */
    const detectHit = (tuning, targetNote) => {
        if (!targetNote || !tuning) return false;

        const cents = Math.round(tuning.cents || 0);
        // Strip octave number since games usually only request string literal names
        const currentNote = tuning.note ? tuning.note.replace(/\\d+$/, '') : null;

        // Reset if we hear nothing, are out of tune, or hear the wrong note
        if (!currentNote || Math.abs(cents) >= centsMargin || currentNote !== targetNote) {
            debounceStart = 0;
            if (!currentNote) {
                lastPlayedNote = null;
            }
            return false;
        }

        // We hear the right note, check if it's held steady
        if (lastPlayedNote === currentNote) {
            if (debounceStart === 0) {
                debounceStart = Date.now();
                return false;
            }
            if (Date.now() - debounceStart < debounceMs) {
                return false; // Still debouncing
            }
        }

        // Hit verified! Reset state for the next required hit
        lastPlayedNote = currentNote;
        debounceStart = 0;

        return true;
    };

    /**
     * Resets the internal debounce state. Call this when transitioning between turns or rounds.
     */
    const reset = () => {
        debounceStart = 0;
        lastPlayedNote = null;
    };

    return { detectHit, reset };
}
