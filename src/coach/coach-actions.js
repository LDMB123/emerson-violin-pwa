import { getLearningRecommendations } from '../ml/recommendations.js';
import {
    COACH_MISSION_COMPLETE,
    GAME_RECORDED,
    LESSON_COMPLETE,
    LESSON_STEP,
    MISSION_UPDATED,
    ML_UPDATE,
    PRACTICE_STEP_COMPLETED,
    PRACTICE_STEP_STARTED,
} from '../utils/event-names.js';
import { isVoiceCoachEnabled } from '../utils/feature-flags.js';

const GAME_MESSAGES = {
    'pitch-quest':    'Nice pitch work! Try using less pressure on the bow next.',
    'rhythm-dash':    'Great rhythm! See if you can keep that tempo in a real song.',
    'bow-hero':       'Smooth bowing! Remember to keep your elbow relaxed.',
    'ear-trainer':    'Sharp ears! That listening skill helps everything.',
    'note-memory':    'Good note memory! Try naming them out loud next time.',
    'tuning-time':    'Perfect — staying in tune is a superpower.',
    'scale-practice': 'Scales are the foundation. That work pays off.',
    'melody-maker':   'You made music! How did it feel?',
    'rhythm-painter': 'Rhythm painter sharpens your inner beat.',
    'string-quest':   'Nice string work! Feel how each string vibrates differently.',
    'pizzicato':      'Pizzicato builds finger strength. Great session.',
    'duet-challenge': 'Playing together takes real listening. Well done.',
    'story-song':     'Stories make music come alive. Lovely session.',
};

let pendingGameMessage = null;
let bubble = null;
let textSpan = null;
let typingTimer = 0;

const baseMessages = [
    'Warm up with open strings and gentle bows.',
    'Play a slow G major scale with steady bow speed.',
    'Tap a steady rhythm, then match it on one note.',
    'Focus on bow straightness and relaxed fingers.',
    'Try a short song and keep your tempo calm.',
];

let messages = [...baseMessages];
let index = 0;

const resolveCoachElements = () => {
    bubble = document.querySelector('[data-progress="coach-speech"]');
    textSpan = bubble?.querySelector('.coach-bubble-text') || null;
    return Boolean(bubble && textSpan);
};

const canSpeak = () => isVoiceCoachEnabled() && 'speechSynthesis' in window;

const speakMessage = (message) => {
    if (!message || !canSpeak()) return;
    if (document.hidden) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    } catch {
        // Ignore speech failures
    }
};

const setMessage = (message) => {
    if (!resolveCoachElements()) return;
    clearTimeout(typingTimer);
    const activeBubble = bubble;
    const activeTextSpan = textSpan;
    activeBubble.classList.remove('is-revealed');
    activeBubble.classList.add('is-typing');
    typingTimer = window.setTimeout(() => {
        if (!activeBubble?.isConnected || !activeTextSpan?.isConnected) return;
        activeTextSpan.textContent = message;
        activeBubble.classList.remove('is-typing');
        activeBubble.classList.add('is-revealed');
    }, 600);
};

const buildMessages = (recs) => {
    const next = [...baseMessages];
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
        pendingGameMessage = null;
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

const applyRecommendations = async () => {
    const recs = await getLearningRecommendations();
    messages = buildMessages(recs);
    index = 0;
    if (resolveCoachElements() && bubble.dataset.coachAuto !== 'false') {
        setMessage(messages[0] || bubble.textContent);
    }
};

const handleAction = (action) => {
    if (!messages.length) return;
    if (action === 'next') {
        index = (index + 1) % messages.length;
        const message = messages[index];
        setMessage(message);
        speakMessage(message);
        return;
    }
    if (action === 'retry') {
        const current = messages[index] || messages[0];
        const message = `One more time: ${current}`;
        setMessage(message);
        speakMessage(message);
    }
};

const bindCoachActions = () => {
    const buttons = Array.from(document.querySelectorAll('[data-coach-action]'));
    buttons.forEach((button) => {
        if (button.dataset.coachActionBound === 'true') return;
        button.dataset.coachActionBound = 'true';
        button.addEventListener('click', () => {
            const action = button.dataset.coachAction;
            handleAction(action);
            if (resolveCoachElements()) bubble.dataset.coachAuto = 'false';
        });
    });
};

const handleLessonStep = (event) => {
    if (!resolveCoachElements()) return;
    const detail = event.detail || {};
    const step = detail.step;
    if (!step) return;
    const stepIndex = Number.isFinite(detail.index) ? detail.index : 0;
    const total = Number.isFinite(detail.total) ? detail.total : 1;
    let message = '';
    if (detail.state === 'start') {
        message = `Step ${stepIndex + 1} of ${total}: ${step.label || 'Practice step'}. ${step.cue || ''}`.trim();
    } else if (detail.state === 'complete') {
        message = `Nice work! Step ${stepIndex + 1} complete.`;
    } else if (detail.state === 'pause') {
        message = `Paused on step ${stepIndex + 1}. Resume when you're ready.`;
    }
    if (message) {
        bubble.dataset.coachAuto = 'false';
        setMessage(message);
        speakMessage(message);
    }
};

const handleLessonComplete = () => {
    if (!resolveCoachElements()) return;
    const message = 'Lesson complete! Take a breath, then choose a new plan.';
    bubble.dataset.coachAuto = 'false';
    setMessage(message);
    speakMessage(message);
};

const handleMissionComplete = (event) => {
    if (!resolveCoachElements()) return;
    const completed = Number.isFinite(event.detail?.completed) ? event.detail.completed : null;
    const total = Number.isFinite(event.detail?.total) ? event.detail.total : null;
    const summary = (completed !== null && total !== null)
        ? `Mission complete! ${completed}/${total} goals done.`
        : 'Mission complete! All goals done.';
    const message = `${summary} Open Wins or share with a grown-up review.`;
    bubble.dataset.coachAuto = 'false';
    setMessage(message);
    speakMessage(message);
};

const handleMissionUpdated = (event) => {
    if (!resolveCoachElements()) return;
    const mission = event.detail?.mission;
    if (!mission?.currentStepId || !Array.isArray(mission.steps)) return;
    const step = mission.steps.find((item) => item.id === mission.currentStepId);
    if (!step?.label) return;

    const prefix = step.source === 'remediation' ? 'Remediation step' : 'Current mission step';
    const message = `${prefix}: ${step.label}.`;
    bubble.dataset.coachAuto = 'false';
    setMessage(message);
};

const initCoachActions = () => {
    resolveCoachElements();
    bindCoachActions();
    applyRecommendations();
};

export const init = initCoachActions;

document.addEventListener(ML_UPDATE, applyRecommendations);
document.addEventListener(LESSON_STEP, handleLessonStep);
document.addEventListener(LESSON_COMPLETE, handleLessonComplete);
document.addEventListener(COACH_MISSION_COMPLETE, handleMissionComplete);
document.addEventListener(MISSION_UPDATED, handleMissionUpdated);
document.addEventListener(PRACTICE_STEP_STARTED, (event) => {
    if (!resolveCoachElements()) return;
    const stepLabel = event.detail?.step?.label;
    if (!stepLabel) return;
    const message = `Started: ${stepLabel}.`;
    bubble.dataset.coachAuto = 'false';
    setMessage(message);
});
document.addEventListener(PRACTICE_STEP_COMPLETED, (event) => {
    if (!resolveCoachElements()) return;
    const stepLabel = event.detail?.step?.label;
    if (!stepLabel) return;
    const message = `Completed: ${stepLabel}.`;
    bubble.dataset.coachAuto = 'false';
    setMessage(message);
});
document.addEventListener(GAME_RECORDED, (e) => {
    const id = e.detail?.id;
    if (id && GAME_MESSAGES[id]) {
        pendingGameMessage = GAME_MESSAGES[id];
    }
});

document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id !== 'setting-voice') return;
    if (!target.checked) {
        window.speechSynthesis.cancel();
    }
});
