import { clamp } from './math.js';

/**
 * Converts a numeric score to a 1-5 star string.
 *
 * @param {number} score
 * @returns {string}
 */
export const starString = (score) => {
    const stars = clamp(Math.round(score / 20), 1, 5);
    return '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(stars);
};

const COACH_MESSAGES = {
    pitch: 'Great bowing arm! Try to keep your pitch steady through the middle section.',
    rhythm: 'Keep the pulse steady. Tap the rhythm before you play.',
    bow_control: 'Smooth bow path. Relax your hand and keep the bow straight.',
    posture: 'Tall spine and relaxed shoulders. Keep your wrists soft.',
    reading: 'Slow down and name each note before playing.',
};

/**
 * Returns the default coach message for a skill area.
 *
 * @param {string} skill
 * @returns {string}
 */
export const coachMessageFor = (skill) => {
    return COACH_MESSAGES[skill] || 'Nice work today! Keep your tempo steady.';
};

/**
 * Builds SVG path data for a lightweight score chart.
 *
 * @param {number[]} values
 * @returns {{ path: string, points: Array<{ x: number, y: number }> } | null}
 */
export const buildChart = (values) => {
    const width = 320;
    const height = 180;
    const padding = 20;
    if (!values.length) return null;
    const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
    const points = values.map((val, index) => {
        const x = padding + step * index;
        const y = padding + (1 - val / 100) * (height - padding * 2);
        return { x, y };
    });
    const path = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
        .join(' ');
    return { path, points };
};

/**
 * Returns the encouragement caption for the latest score.
 *
 * @param {number} latestScore
 * @returns {string}
 */
export const chartCaptionFor = (latestScore) => {
    if (latestScore >= 80) return 'Great job!';
    if (latestScore >= 60) return 'Nice work!';
    return 'Keep practicing!';
};

/**
 * Returns the most recent events in reverse chronological order.
 *
 * @template T
 * @param {T[]} events
 * @param {number} [count=2]
 * @returns {T[]}
 */
export const getRecentEvents = (events, count = 2) => {
    return events.slice(-count).reverse();
};
