import { pickDailyCue } from '../utils/recommendations-utils.js';
import { toViewId } from '../utils/lesson-plan-utils.js';
import { atLeast1 } from '../utils/math.js';
export { buildMissionContract, buildNextActions } from './recommendations-plan-actions.js';

/** Base coach-message templates keyed by weakest-skill domain. */
export const COACH_MESSAGES = {
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
        'Use soft Bunny Hands on the bow.',
    ],
    reading: [
        'Name the note first, then place the finger and play.',
        'Trace the note on the staff, then find it on the string.',
        'Slow down and keep the eyes one note ahead.',
    ],
    posture: [
        'Stand tall with Jelly Shoulders and a soft bow hand.',
        'Check your Cinnamon Roll scroll height!',
        'Keep both wrists long and flexible like a snake.',
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
        cue: 'Jelly Shoulders, Cinnamon Roll up, Bunny Hand.',
    },
};

const SONG_LABELS = {
    beginner: 'Play one beginner song slowly',
    intermediate: 'Play one intermediate song with calm tempo',
    advanced: 'Play one challenge song with smooth tone',
};

const computeAdaptiveMinutes = (skillScores) => {
    // Machine Learning Telemetry: Scale durations proportionally to the player's accuracy decay.
    // If a skill drops below 60%, allocate heavier training weight.
    const getScore = (skill) => skillScores?.[skill] ?? 60;

    // Scale model: lower score = more minutes. baseline 50 gives ~3 minutes.
    const scale = (score, weight = 1) => atLeast1(Math.round(((100 - score) / 15) * weight));

    const totalCalculated = {
        warmup: Math.max(2, scale(getScore('bow_control'), 0.8)),
        focus: Math.max(3, scale(getScore('pitch'), 1.2)),
        rhythm: Math.max(2, scale(getScore('rhythm'), 1.0)),
        ear: atLeast1(scale(getScore('pitch'), 0.6)),
        song: Math.max(3, scale(getScore('reading'), 1.0)),
    };

    // Suzuki 20-Min Cap (Attention Span constraint for an 8yo learner)
    const MAX_MINUTES = 20;
    let sum = Object.values(totalCalculated).reduce((a, b) => a + b, 0);

    if (sum > MAX_MINUTES) {
        let diff = sum - MAX_MINUTES;
        const keysToTrim = ['song', 'rhythm', 'focus']; // trim later/cognitive tasks first

        for (const key of keysToTrim) {
            if (diff <= 0) break;
            const canTrim = Math.max(0, totalCalculated[key] - 1); // never trim below 1
            const trimAmount = Math.min(diff, canTrim);
            totalCalculated[key] -= trimAmount;
            diff -= trimAmount;
        }
    }

    return totalCalculated;
};

/** Builds the adaptive daily lesson plan steps and coach cue for recommendations. */
export const buildLessonSteps = ({ weakestSkill, skillScores, recommendedGameId, metronomeTarget, songLevel, queuedGoals = [] }) => {
    const minutes = computeAdaptiveMinutes(skillScores);
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
                cue: warmupCue || 'Start with Jelly Shoulders and soft Bunny Hands.',
            },
            // Suzuki Rule: "Sound Before Symbol" ensures Ear Training occurs BEFORE Rhythm/Reading.
            {
                ...STEP_BASE.ear,
                label: 'Match pitch by ear on open strings',
                minutes: minutes.ear,
                cue: earCue || 'Listen for the note to settle.',
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
                ...STEP_BASE.song,
                label: SONG_LABELS[songLevel] || STEP_BASE.song.label,
                minutes: minutes.song,
                cue: songCue,
            },
        ].filter(step => !queuedGoals.includes(step.id)),
    };
};
