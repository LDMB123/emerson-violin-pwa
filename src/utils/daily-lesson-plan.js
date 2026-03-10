import { atLeast1 } from './math.js';

const FALLBACK_STEPS = [
    {
        id: 'lesson-warmup',
        label: 'Wake up your bow arm',
        cue: 'Two slow open-string bows on each string.',
        cta: 'view-bowing',
        minutes: 3,
    },
    {
        id: 'lesson-ear',
        label: 'Match one string by ear',
        cue: 'Listen first, then play until the note rings.',
        cta: 'view-game-ear-trainer',
        minutes: 2,
    },
    {
        id: 'lesson-focus',
        label: 'Practice one steady technique game',
        cue: 'Slow down and aim for one clean win at a time.',
        cta: 'view-game-pitch-quest',
        minutes: 4,
    },
    {
        id: 'lesson-rhythm',
        label: 'Tap and play with a steady pulse',
        cue: 'Count the beat before you move the bow.',
        cta: 'view-game-rhythm-dash',
        minutes: 3,
    },
    {
        id: 'lesson-song',
        label: 'Play one song slowly',
        cue: 'Choose a favorite song and keep the beat calm.',
        cta: 'view-songs',
        minutes: 3,
    },
];

const normalizeStep = (step, index) => ({
    id: step?.id || `lesson-step-${index + 1}`,
    label: step?.label || `Practice step ${index + 1}`,
    cue: step?.cue || step?.coachCue || step?.tip || '',
    cta: step?.cta || step?.target || 'view-games',
    minutes: atLeast1(Math.round(step?.minutes || 3)),
});

/** Resolves the daily lesson plan from recommendations, with a fresh-user fallback. */
export const resolveDailyLessonPlan = (recommendations, { childName = '' } = {}) => {
    const lessonSteps = Array.isArray(recommendations?.lessonSteps) && recommendations.lessonSteps.length
        ? recommendations.lessonSteps
        : FALLBACK_STEPS;

    const steps = lessonSteps.map(normalizeStep);
    const totalMinutes = steps.reduce((sum, step) => sum + step.minutes, 0);
    const defaultCue = childName
        ? `${childName}, let's start with one calm win.`
        : "Let's start with one calm win.";

    return {
        coachCue: recommendations?.coachCue || defaultCue,
        steps,
        totalMinutes,
    };
};
