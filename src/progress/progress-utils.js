import { clamp } from '../utils/math.js';

const RADAR_CENTER = 100;
const RADAR_RADIUS = 80;
const RADAR_ORDER = ['pitch', 'rhythm', 'bow_control', 'posture', 'reading'];
const RADAR_ANGLES = RADAR_ORDER.map((_, index) => ((index * 2 * Math.PI) / RADAR_ORDER.length) - Math.PI / 2);

export const todayDay = () => Math.floor(Date.now() / 86400000);

export const minutesForInput = (input) => {
    if (input?.dataset?.minutes) {
        const parsed = Number.parseInt(input.dataset.minutes, 10);
        if (!Number.isNaN(parsed)) return parsed;
    }
    const id = input?.id || '';
    if (/^(goal-step-|parent-goal-)/.test(id)) return 5;
    if (/^goal-(warmup|scale|song|rhythm|ear)/.test(id)) return 5;
    if (/^bow-set-/.test(id)) return 5;
    if (/^(pq-step-|rd-set-|et-step-|bh-step-|sq-step-|rp-pattern-|ss-step-|pz-step-|tt-step-|mm-step-|sp-step-|dc-step-)/.test(id)) return 2;
    if (/^nm-card-/.test(id)) return 1;
    return 1;
};

export const toTrackerTimestamp = (value) => {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : Date.now();
    return BigInt(Math.floor(parsed));
};

export const formatRecentScore = (event) => {
    if (!event) return 'Score 0';
    if (Number.isFinite(event.accuracy)) {
        return `${Math.round(event.accuracy)}%`;
    }
    if (Number.isFinite(event.stars)) {
        return `${Math.round(event.stars)}★`;
    }
    if (Number.isFinite(event.score)) {
        return `Score ${Math.round(event.score)}`;
    }
    return 'Score 0';
};

export const coachMessageFor = (skill) => {
    switch (skill) {
        case 'pitch':
            return 'Let\'s focus on pitch today. Use slow bows and listen for a clear ring.';
        case 'rhythm':
            return 'Let\'s lock in the rhythm. Tap a steady beat before you play.';
        case 'bow_control':
            return 'Today is for smooth bowing. Keep the bow straight and relaxed.';
        case 'posture':
            return 'Quick posture check: tall spine, relaxed shoulders, soft bow hand.';
        case 'reading':
            return 'Let\'s build reading skills. Follow the notes slowly and name each one.';
        default:
            return 'Let\'s start with warm-ups and keep the sound smooth.';
    }
};

export const buildRadarPoints = (skills) => {
    return RADAR_ORDER.map((key, index) => {
        const raw = skills?.[key] ?? 50;
        const value = clamp(raw, 0, 100) / 100;
        const radius = RADAR_RADIUS * value;
        const angle = RADAR_ANGLES[index];
        const x = RADAR_CENTER + radius * Math.cos(angle);
        const y = RADAR_CENTER + radius * Math.sin(angle);
        return { key, x: x.toFixed(1), y: y.toFixed(1) };
    });
};
