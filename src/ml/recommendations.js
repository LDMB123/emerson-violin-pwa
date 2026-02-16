import { getJSON, setJSON } from '../persistence/storage.js';
import { getAdaptiveLog, getGameTuning } from './adaptive-engine.js';
import { clamp } from '../utils/math.js';

const EVENT_KEY = 'panda-violin:events:v1';
const CACHE_KEY = 'panda-violin:ml:recs-v1';
const CACHE_TTL = 5 * 60 * 1000;

const SKILL_BY_GAME = {
    'pitch-quest': 'pitch',
    'ear-trainer': 'pitch',
    'tuning-time': 'pitch',
    tuner: 'pitch',
    'scale-practice': 'pitch',
    'rhythm-dash': 'rhythm',
    'rhythm-painter': 'rhythm',
    pizzicato: 'rhythm',
    'duet-challenge': 'rhythm',
    'bow-hero': 'bow_control',
    'string-quest': 'bow_control',
    'note-memory': 'reading',
    'melody-maker': 'reading',
    'story-song': 'reading',
    'coach-focus': 'focus',
    'trainer-metronome': 'rhythm',
    'trainer-posture': 'posture',
    'bowing-coach': 'bow_control',
};

const GAME_BY_SKILL = {
    pitch: 'pitch-quest',
    rhythm: 'rhythm-dash',
    bow_control: 'bow-hero',
    reading: 'note-memory',
    posture: 'view-posture',
};

const GAME_LABELS = {
    'pitch-quest': 'Pitch Quest',
    'rhythm-dash': 'Rhythm Dash',
    'bow-hero': 'Bow Hero',
    'note-memory': 'Note Memory',
    'view-posture': 'Posture Mirror',
};

const COACH_MESSAGES = {
    pitch: 'Pitch focus: aim for clean, centered notes today.',
    rhythm: 'Rhythm focus: tap the beat before you play.',
    bow_control: 'Bow focus: keep the bow straight and relaxed.',
    reading: 'Reading focus: name the notes before you play.',
    posture: 'Posture focus: tall spine and relaxed shoulders.',
    default: 'Nice work today! Keep your tempo calm and steady.',
};

const SKILL_LABELS = {
    pitch: 'Pitch',
    rhythm: 'Rhythm',
    bow_control: 'Bowing',
    reading: 'Reading',
    posture: 'Posture',
    focus: 'Focus',
};

const MASTER_CUES = {
    pitch: [
        'Listen for the ring and slide your finger until the sound locks in.',
        'Keep the left hand relaxed and let the finger drop from above.',
        'Match the pitch, then hold the note steady for three slow bows.',
    ],
    rhythm: [
        'Count out loud before you play: one, two, three, four.',
        'Clap the rhythm first, then play it on one note.',
        'Feel the steady pulse in your feet while you tap.',
    ],
    bow_control: [
        'Keep the bow parallel to the bridge from frog to tip.',
        'Lead with the elbow and let the wrist stay soft.',
        'Use full bows and keep the contact point consistent.',
    ],
    reading: [
        'Name the note first, then place the finger and play.',
        'Trace the note on the staff, then find it on the string.',
        'Slow down and keep the eyes one note ahead.',
    ],
    posture: [
        'Stand tall with relaxed shoulders and a soft bow hand.',
        'Keep the violin on the collarbone, not the shoulder.',
        'Check that both wrists stay long and flexible.',
    ],
    focus: [
        'Take a calm breath before you start each exercise.',
        'Use small goals and celebrate each one you finish.',
        'Stay patient and listen closely to your sound.',
    ],
};

const STEP_BASE = {
    warmup: { id: 'goal-warmup', label: 'Open strings with long bows', minutes: 3, cta: 'view-bowing' },
    focus: { id: 'goal-scale', label: 'Technique focus', minutes: 4, cta: 'view-games' },
    rhythm: { id: 'goal-rhythm', label: 'Metronome clap and tap', minutes: 3, cta: 'view-game-rhythm-dash' },
    ear: { id: 'goal-ear', label: 'Match open strings by ear', minutes: 2, cta: 'view-game-ear-trainer' },
    song: { id: 'goal-song', label: 'Play one song slowly', minutes: 3, cta: 'view-songs' },
};

const SKILL_FOCUS = {
    pitch: {
        label: 'Scale focus with steady intonation',
        cta: 'view-game-scale-practice',
        cue: 'Aim for a clear ring on each note.',
    },
    rhythm: {
        label: 'Rhythm focus with steady pulse',
        cta: 'view-game-rhythm-dash',
        cue: 'Lock in the beat before you play.',
    },
    bow_control: {
        label: 'Bow control focus with straight lanes',
        cta: 'view-game-bow-hero',
        cue: 'Keep the bow lane between fingerboard and bridge.',
    },
    reading: {
        label: 'Reading focus with note naming',
        cta: 'view-game-note-memory',
        cue: 'Name each note before you play it.',
    },
    posture: {
        label: 'Posture focus with mirror check',
        cta: 'view-posture',
        cue: 'Check shoulders, chin rest, and bow grip.',
    },
};

const SONG_LABELS = {
    beginner: 'Play one beginner song slowly',
    intermediate: 'Play one intermediate song with calm tempo',
    advanced: 'Play one challenge song with smooth tone',
};

const MINUTE_ADJUSTMENTS = {
    pitch: { focus: 1, ear: 1, song: -2 },
    rhythm: { focus: 1, rhythm: 1, ear: -1, song: -1 },
    bow_control: { warmup: 1, focus: 1, ear: -1, song: -1 },
    reading: { focus: 1, song: 1, ear: -2 },
    posture: { warmup: 1, focus: 1, ear: -1, song: -1 },
};

const toViewId = (id) => {
    if (!id) return 'view-games';
    if (id.startsWith('view-')) return id;
    return `view-game-${id}`;
};

const pickDailyCue = (list, seed = 0) => {
    if (!Array.isArray(list) || !list.length) return '';
    const day = Math.floor(Date.now() / 86400000);
    const index = Math.abs(day + seed) % list.length;
    return list[index] || list[0];
};

const buildMinutes = (skill) => {
    const base = {
        warmup: STEP_BASE.warmup.minutes,
        focus: STEP_BASE.focus.minutes,
        rhythm: STEP_BASE.rhythm.minutes,
        ear: STEP_BASE.ear.minutes,
        song: STEP_BASE.song.minutes,
    };
    const adjust = MINUTE_ADJUSTMENTS[skill];
    if (!adjust) return base;
    Object.entries(adjust).forEach(([key, value]) => {
        base[key] = Math.max(1, base[key] + value);
    });
    return base;
};

const buildLessonSteps = ({ weakestSkill, recommendedGameId, metronomeTarget, songLevel }) => {
    const minutes = buildMinutes(weakestSkill);
    const focus = SKILL_FOCUS[weakestSkill] || SKILL_FOCUS.pitch;
    const coachCue = pickDailyCue(MASTER_CUES[weakestSkill] || MASTER_CUES.focus, (weakestSkill || '').length);
    const warmupCue = pickDailyCue(MASTER_CUES.bow_control || [], minutes.warmup);
    const rhythmCue = pickDailyCue(MASTER_CUES.rhythm || [], minutes.rhythm);
    const earCue = pickDailyCue(MASTER_CUES.pitch || [], minutes.ear);
    const songCue = 'Slow tempo first. Keep the tone even.';

    return {
        coachCue,
        steps: [
            {
                ...STEP_BASE.warmup,
                minutes: minutes.warmup,
                cue: warmupCue || 'Use full bows with relaxed shoulders.',
            },
            {
                ...STEP_BASE.focus,
                label: focus.label,
                minutes: minutes.focus,
                cta: focus.cta || toViewId(recommendedGameId),
                cue: focus.cue,
            },
            {
                ...STEP_BASE.rhythm,
                label: `Metronome ${Math.round(metronomeTarget || 90)} BPM pulse`,
                minutes: minutes.rhythm,
                cue: rhythmCue || 'Tap before you play.',
            },
            {
                ...STEP_BASE.ear,
                label: 'Match pitch by ear on open strings',
                minutes: minutes.ear,
                cue: earCue || 'Listen for the note to settle.',
            },
            {
                ...STEP_BASE.song,
                label: SONG_LABELS[songLevel] || STEP_BASE.song.label,
                minutes: minutes.song,
                cue: songCue,
            },
        ],
    };
};

const loadEvents = async () => {
    const stored = await getJSON(EVENT_KEY);
    return Array.isArray(stored) ? stored : [];
};

const average = (values) => {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const recencyWeight = (timestamp) => {
    if (!timestamp) return 1;
    const daysAgo = Math.max(0, (Date.now() - timestamp) / 86400000);
    return 1 / (1 + daysAgo * 0.35);
};

const weightedAverage = (items, getValue, getWeight) => {
    if (!items.length) return 0;
    let total = 0;
    let weightSum = 0;
    items.forEach((item) => {
        const value = getValue(item);
        const weight = getWeight(item);
        if (Number.isFinite(value) && Number.isFinite(weight)) {
            total += value * weight;
            weightSum += weight;
        }
    });
    if (!weightSum) return 0;
    return total / weightSum;
};

const computeRecommendations = async () => {
    const [events, adaptiveLog, metronomeTuning] = await Promise.all([
        loadEvents(),
        getAdaptiveLog(),
        getGameTuning('trainer-metronome').catch(() => ({ targetBpm: 90 })),
    ]);

    const skillTotals = new Map();
    const skillCounts = new Map();

    adaptiveLog.forEach((entry) => {
        const skill = SKILL_BY_GAME[entry.id];
        if (!skill) return;
        const value = clamp(Number.isFinite(entry.accuracy) ? entry.accuracy : entry.score || 0, 0, 100);
        const weight = recencyWeight(entry.timestamp);
        skillTotals.set(skill, (skillTotals.get(skill) || 0) + value * weight);
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + weight);
    });

    const skillScores = {};
    skillTotals.forEach((total, skill) => {
        const count = skillCounts.get(skill) || 1;
        skillScores[skill] = clamp(total / count, 0, 100);
    });

    const skillCandidates = ['pitch', 'rhythm', 'bow_control', 'reading', 'posture'];
    const weakestSkill = skillCandidates.reduce((weakest, skill) => {
        const score = skillScores[skill] ?? 60;
        if (!weakest) return { skill, score };
        return score < weakest.score ? { skill, score } : weakest;
    }, null)?.skill || 'pitch';

    const songEvents = events.filter((event) => event.type === 'song');
    const recentSongEvents = songEvents.slice(-8);
    const averageSong = weightedAverage(
        recentSongEvents,
        (event) => clamp(event.accuracy || 0, 0, 100),
        (event) => recencyWeight(event.timestamp)
    ) || average(recentSongEvents.map((event) => clamp(event.accuracy || 0, 0, 100)));
    const songLevel = averageSong >= 85 ? 'advanced' : averageSong >= 65 ? 'intermediate' : 'beginner';

    const recommendedGameId = GAME_BY_SKILL[weakestSkill] || 'pitch-quest';
    const recommendedGameLabel = GAME_LABELS[recommendedGameId] || 'Pitch Quest';

    const metronomeTarget = metronomeTuning?.targetBpm || 90;
    const lessonPlan = buildLessonSteps({
        weakestSkill,
        recommendedGameId,
        metronomeTarget,
        songLevel,
    });
    const lessonSteps = lessonPlan.steps || [];
    const lessonTotal = lessonSteps.reduce((sum, step) => sum + (step.minutes || 0), 0);

    const coachCue = lessonPlan.coachCue || '';
    const coachMessage = coachCue || COACH_MESSAGES[weakestSkill] || COACH_MESSAGES.default;
    const firstStep = lessonSteps[0];
    const coachActionMessage = firstStep?.label
        ? `Start with ${firstStep.label.toLowerCase()}.`
        : `Try ${recommendedGameLabel} next to build ${weakestSkill.replace('_', ' ')}.`;

    return {
        weakestSkill,
        skillScores,
        recommendedGameId,
        recommendedGameLabel,
        songLevel,
        coachMessage,
        coachActionMessage,
        metronomeTarget,
        lessonSteps,
        lessonTotal,
        coachCue,
        skillLabel: SKILL_LABELS[weakestSkill] || 'Pitch',
    };
};

const readCache = async () => {
    const cached = await getJSON(CACHE_KEY);
    if (!cached || typeof cached !== 'object') return null;
    if (!cached.recommendations) return null;
    return cached;
};

const cacheFresh = (cached) => {
    if (!cached?.updatedAt) return false;
    return (Date.now() - cached.updatedAt) < CACHE_TTL;
};

export const refreshRecommendationsCache = async () => {
    const recommendations = await computeRecommendations();
    const payload = {
        updatedAt: Date.now(),
        recommendations,
    };
    await setJSON(CACHE_KEY, payload);
    return recommendations;
};

export const getCachedRecommendations = async () => {
    const cached = await readCache();
    return cached?.recommendations || null;
};

export const getLearningRecommendations = async ({ allowCached = true } = {}) => {
    if (allowCached) {
        const cached = await readCache();
        if (cached?.recommendations) {
            if (!cacheFresh(cached)) {
                refreshRecommendationsCache().catch(() => {});
            }
            return cached.recommendations;
        }
    }
    return refreshRecommendationsCache();
};
