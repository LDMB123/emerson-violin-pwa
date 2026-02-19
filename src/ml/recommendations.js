import { getJSON, setJSON } from '../persistence/storage.js';
import { loadEvents } from '../persistence/loaders.js';
import { getAdaptiveLog, getGameTuning } from './adaptive-engine.js';
import {
    GAME_BY_SKILL,
    GAME_LABELS,
    SKILL_LABELS,
    computeSkillScores,
    findWeakestSkill,
    computeSongLevel,
    pickDailyCue,
} from '../utils/recommendations-utils.js';
import { ML_RECS_KEY as CACHE_KEY } from '../persistence/storage-keys.js';
import { ensureCurrentMission } from '../curriculum/engine.js';

const CACHE_TTL = 5 * 60 * 1000;
let refreshPromise = null;

const COACH_MESSAGES = {
    pitch: 'Pitch focus: aim for clean, centered notes today.',
    rhythm: 'Rhythm focus: tap the beat before you play.',
    bow_control: 'Bow focus: keep the bow straight and relaxed.',
    reading: 'Reading focus: name the notes before you play.',
    posture: 'Posture focus: tall spine and relaxed shoulders.',
    default: 'Nice work today! Keep your tempo calm and steady.',
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

const DEFAULT_MASTERY_THRESHOLDS = {
    bronze: 60,
    silver: 80,
    gold: 92,
    distinctDays: 3,
};

const toViewId = (id) => {
    if (!id) return 'view-games';
    if (id.startsWith('view-')) return id;
    return `view-game-${id}`;
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

const bucketLevel = (score, { bronze, silver, gold }) => {
    if (score >= gold) return 'gold';
    if (score >= silver) return 'silver';
    if (score >= bronze) return 'bronze';
    return 'none';
};

const masteryFromEvents = (events, thresholds = DEFAULT_MASTERY_THRESHOLDS) => {
    const gamesById = new Map();
    const songsById = new Map();

    events.forEach((event) => {
        if (!event || typeof event !== 'object') return;
        if (event.type !== 'game' && event.type !== 'song') return;
        const id = event.id;
        if (!id) return;
        const score = Number.isFinite(event.accuracy) ? event.accuracy : event.score;
        if (!Number.isFinite(score)) return;

        const targetMap = event.type === 'game' ? gamesById : songsById;
        const entry = targetMap.get(id) || {
            id,
            best: 0,
            attempts: 0,
            byDay: new Map(),
        };

        entry.attempts += 1;
        entry.best = Math.max(entry.best, Math.round(score));

        if (Number.isFinite(event.day)) {
            const dayScore = entry.byDay.get(event.day) || 0;
            entry.byDay.set(event.day, Math.max(dayScore, Math.round(score)));
        }

        targetMap.set(id, entry);
    });

    const withTier = (entry) => {
        const days = Array.from(entry.byDay.values());
        const bronzeDays = days.filter((score) => score >= thresholds.bronze).length;
        const silverDays = days.filter((score) => score >= thresholds.silver).length;
        const goldDays = days.filter((score) => score >= thresholds.gold).length;

        let tier = bucketLevel(entry.best, thresholds);
        if (tier !== 'none') {
            const eligibleDays = tier === 'gold' ? goldDays : tier === 'silver' ? silverDays : bronzeDays;
            if (eligibleDays < thresholds.distinctDays) {
                tier = 'foundation';
            }
        }

        return {
            id: entry.id,
            best: entry.best,
            attempts: entry.attempts,
            bronzeDays,
            silverDays,
            goldDays,
            tier,
        };
    };

    return {
        games: Object.fromEntries(Array.from(gamesById.values()).map((entry) => [entry.id, withTier(entry)])),
        songs: Object.fromEntries(Array.from(songsById.values()).map((entry) => [entry.id, withTier(entry)])),
    };
};

const skillMastery = (skillScores) => {
    const entries = Object.entries(skillScores || {});
    const byTier = {
        gold: [],
        silver: [],
        bronze: [],
        developing: [],
    };

    entries.forEach(([id, rawScore]) => {
        const score = Math.max(0, Math.min(100, Math.round(rawScore || 0)));
        const item = {
            id,
            label: SKILL_LABELS[id] || id,
            score,
        };
        if (score >= 92) byTier.gold.push(item);
        else if (score >= 80) byTier.silver.push(item);
        else if (score >= 60) byTier.bronze.push(item);
        else byTier.developing.push(item);
    });

    return byTier;
};

const buildMissionContract = (mission) => {
    if (!mission) {
        return {
            id: null,
            phase: 'core',
            steps: [],
            currentStepId: null,
            remediationStepIds: [],
            completionPercent: 0,
            unitId: null,
            status: 'idle',
        };
    }

    return {
        id: mission.id,
        phase: mission.phase || 'core',
        steps: Array.isArray(mission.steps)
            ? mission.steps.map((step) => ({
                id: step.id,
                type: step.type,
                label: step.label,
                target: step.target,
                status: step.status,
                source: step.source || 'plan',
            }))
            : [],
        currentStepId: mission.currentStepId || null,
        remediationStepIds: Array.isArray(mission.remediationStepIds) ? mission.remediationStepIds : [],
        completionPercent: Number.isFinite(mission.completionPercent) ? mission.completionPercent : 0,
        unitId: mission.unitId || null,
        tier: mission.tier || null,
        status: mission.status || 'active',
    };
};

const getCurrentMissionStep = (mission) => {
    if (!mission?.steps?.length) return null;
    return mission.steps.find((step) => step.id === mission.currentStepId)
        || mission.steps.find((step) => step.status === 'in_progress')
        || mission.steps.find((step) => step.status === 'not_started')
        || mission.steps[mission.steps.length - 1]
        || null;
};

const buildNextActions = ({ mission, recommendedGameId, recommendedGameLabel, weakestSkill, songLevel }) => {
    const actions = [];

    const missionStep = getCurrentMissionStep(mission);
    if (missionStep) {
        const cta = missionStep.type === 'song'
            ? '#view-songs'
            : missionStep.type === 'tuner'
                ? '#view-tuner'
                : missionStep.target?.startsWith('view-')
                    ? `#${missionStep.target}`
                    : missionStep.target?.includes(':')
                        ? `#view-game-${missionStep.target.split(':')[0]}`
                        : '#view-coach';

        actions.push({
            id: 'resume-mission-step',
            label: `Resume: ${missionStep.label || 'Mission step'}`,
            href: cta,
            rationale: `Current mission step (${mission.phase || 'core'} phase).`,
        });
    }

    if (recommendedGameId) {
        actions.push({
            id: 'recommended-game',
            label: `Play ${recommendedGameLabel || 'recommended game'}`,
            href: `#${toViewId(recommendedGameId)}`,
            rationale: `${SKILL_LABELS[weakestSkill] || 'Core'} is your weakest skill right now.`,
        });
    }

    actions.push({
        id: 'recommended-song',
        label: `Practice a ${songLevel || 'beginner'} song`,
        href: '#view-songs',
        rationale: 'Song work closes the loop on tone, rhythm, and reading.',
    });

    return actions.slice(0, 3);
};

const computeRecommendations = async () => {
    const [events, adaptiveLog, metronomeTuning] = await Promise.all([
        loadEvents(),
        getAdaptiveLog(),
        getGameTuning('trainer-metronome').catch(() => ({ targetBpm: 90 })),
    ]);

    const skillScores = computeSkillScores(adaptiveLog);
    const weakestSkill = findWeakestSkill(skillScores);
    const songEvents = events.filter((e) => e.type === 'song');
    const songLevel = computeSongLevel(songEvents);

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

    const baseRecommendations = {
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

    const missionSnapshot = await ensureCurrentMission({
        recommendations: baseRecommendations,
        events,
    });

    const mission = buildMissionContract(missionSnapshot?.mission);

    const masteryEvents = masteryFromEvents(events, missionSnapshot?.content?.masteryThresholds || DEFAULT_MASTERY_THRESHOLDS);
    const mastery = {
        games: masteryEvents.games,
        songs: masteryEvents.songs,
        skills: skillMastery(skillScores),
    };

    const nextActions = buildNextActions({
        mission,
        recommendedGameId,
        recommendedGameLabel,
        weakestSkill,
        songLevel,
    });

    return {
        ...baseRecommendations,
        mission,
        mastery,
        nextActions,
    };
};

const readCache = async () => {
    const cached = await getJSON(CACHE_KEY);
    if (!cached || typeof cached !== 'object') return null;
    if (!cached.recommendations) return null;
    return cached;
};

const runRefreshRecommendations = async () => {
    const recommendations = await computeRecommendations();
    const payload = {
        updatedAt: Date.now(),
        recommendations,
    };
    await setJSON(CACHE_KEY, payload);
    return recommendations;
};

export const refreshRecommendationsCache = async () => {
    if (refreshPromise) {
        return refreshPromise;
    }
    refreshPromise = runRefreshRecommendations().finally(() => {
        refreshPromise = null;
    });
    return refreshPromise;
};

export const getLearningRecommendations = async ({ allowCached = true } = {}) => {
    if (allowCached) {
        const cached = await readCache();
        if (cached?.recommendations) {
            if (!cached?.updatedAt || (Date.now() - cached.updatedAt) >= CACHE_TTL) {
                refreshRecommendationsCache().catch(() => {});
            }
            return cached.recommendations;
        }
    }
    return refreshRecommendationsCache();
};
