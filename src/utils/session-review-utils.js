import { clamp } from './math.js';

export const todayDay = () => Math.floor(Date.now() / 86400000);

export const starString = (score) => {
    const stars = clamp(Math.round(score / 20), 1, 5);
    return '★★★★★'.slice(0, stars) + '☆☆☆☆☆'.slice(stars);
};

export const coachMessageFor = (skill) => {
    switch (skill) {
        case 'pitch':
            return 'Great bowing arm! Try to keep your pitch steady through the middle section.';
        case 'rhythm':
            return 'Keep the pulse steady. Tap the rhythm before you play.';
        case 'bow_control':
            return 'Smooth bow path. Relax your hand and keep the bow straight.';
        case 'posture':
            return 'Tall spine and relaxed shoulders. Keep your wrists soft.';
        case 'reading':
            return 'Slow down and name each note before playing.';
        default:
            return 'Nice work today! Keep your tempo steady.';
    }
};

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

export const chartCaptionFor = (latestScore) => {
    if (latestScore >= 80) return 'Great job!';
    if (latestScore >= 60) return 'Nice work!';
    return 'Keep practicing!';
};

export const filterSongEvents = (events) => {
    return events.filter((event) => event.type === 'song');
};

export const getRecentEvents = (events, count = 2) => {
    return events.slice(-count).reverse();
};

export const computeTotalMinutes = (events) => {
    if (!events.length) return 0;
    return events.reduce((sum, event) => sum + (event.duration || 0), 0);
};

export const computeAverageAccuracy = (events) => {
    if (!events.length) return 0;
    const total = events.reduce((sum, event) => sum + (event.accuracy || 0), 0);
    return Math.round(total / events.length);
};

export const extractAccuracyValues = (events, maxCount = 7) => {
    return events.slice(-maxCount).map((event) => clamp(event.accuracy || 0, 0, 100));
};
