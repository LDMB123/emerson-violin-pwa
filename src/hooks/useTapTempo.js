import { useRef, useState } from 'react';

/**
 * useTapTempo — shared tap-tempo calculation hook.
 * Returns { bpm, handleTap, reset }
 *
 * @param {object} opts
 * @param {number} [opts.minBpm=40]  — minimum valid BPM
 * @param {number} [opts.maxBpm=208] — maximum valid BPM
 * @param {number} [opts.windowMs=2000] — ms after which tap history resets
 * @param {number} [opts.maxTaps=4] — max taps kept in history
 * @param {function} [opts.onBpm] — optional callback fired with computed BPM
 */
export function useTapTempo({
    minBpm = 40,
    maxBpm = 208,
    windowMs = 2000,
    maxTaps = 4,
    onBpm,
} = {}) {
    const tapTimesRef = useRef([]);
    const [bpmOverride, setBpmOverride] = useState(null);

    const handleTap = () => {
        const now = performance.now();

        // Flush stale taps outside the window
        tapTimesRef.current = tapTimesRef.current.filter(t => now - t < windowMs);
        tapTimesRef.current.push(now);

        if (tapTimesRef.current.length > maxTaps) {
            tapTimesRef.current.shift();
        }

        if (tapTimesRef.current.length >= 2) {
            const taps = tapTimesRef.current;
            let totalInterval = 0;
            for (let i = 1; i < taps.length; i++) {
                totalInterval += taps[i] - taps[i - 1];
            }
            const avgInterval = totalInterval / (taps.length - 1);
            const computed = Math.round(60000 / avgInterval);

            if (computed >= minBpm && computed <= maxBpm) {
                setBpmOverride(computed);
                onBpm?.(computed);
                return computed;
            }
        }
        return null;
    };

    const reset = () => {
        tapTimesRef.current = [];
        setBpmOverride(null);
    };

    return { bpmOverride, handleTap, reset };
}
