export const GAME_MESSAGES = {
    'pitch-quest': 'Nice pitch work! Try using less pressure on the bow next.',
    'rhythm-dash': 'Great rhythm! See if you can keep that tempo in a real song.',
    'bow-hero': 'Smooth bowing! Remember to keep your elbow relaxed.',
    'ear-trainer': 'Sharp ears! That listening skill helps everything.',
    'note-memory': 'Good note memory! Try naming them out loud next time.',
    'tuning-time': 'Perfect — staying in tune is a superpower.',
    'scale-practice': 'Scales are the foundation. That work pays off.',
    'melody-maker': 'You made music! How did it feel?',
    'rhythm-painter': 'Rhythm painter sharpens your inner beat.',
    'string-quest': 'Nice string work! Feel how each string vibrates differently.',
    pizzicato: 'Pizzicato builds finger strength. Great session.',
    'duet-challenge': 'Playing together takes real listening. Well done.',
    'story-song': 'Stories make music come alive. Lovely session.',
};

const BASE_MESSAGES = [
    'Warm up with open strings and gentle bows.',
    'Play a slow G major scale with steady bow speed.',
    'Tap a steady rhythm, then match it on one note.',
    'Focus on bow straightness and relaxed fingers.',
    'Try a short song and keep your tempo calm.',
];

export const getBaseCoachMessages = () => [...BASE_MESSAGES];

export const buildCoachMessages = ({ recs, pendingGameMessage }) => {
    const next = [...BASE_MESSAGES];
    if (recs?.coachMessage) next.unshift(recs.coachMessage);
    if (Array.isArray(recs?.nextActions) && recs.nextActions.length) {
        next.push(`${recs.nextActions[0].label}. ${recs.nextActions[0].rationale || ''}`.trim());
    }
    if (recs?.mission?.currentStepId && Array.isArray(recs?.mission?.steps)) {
        const currentStep = recs.mission.steps.find((step) => step.id === recs.mission.currentStepId);
        if (currentStep?.label) {
            next.unshift(`Mission step: ${currentStep.label}.`);
            if (currentStep.source === 'remediation') {
                next.unshift('Quick recovery mode: let us tighten this skill before moving on.');
            }
        }
    }
    if (pendingGameMessage) {
        next.unshift(pendingGameMessage);
    }
    if (recs?.coachCue) next.unshift(recs.coachCue);
    if (Array.isArray(recs?.lessonSteps)) {
        recs.lessonSteps.forEach((step) => {
            if (!step?.label) return;
            const cue = step.cue ? ` ${step.cue}` : '';
            next.push(`${step.label}.${cue}`.trim());
        });
    }
    if (recs?.coachActionMessage) next.push(recs.coachActionMessage);
    return Array.from(new Set(next)).filter(Boolean);
};
