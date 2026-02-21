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
import {
    GAME_MESSAGES,
    buildCoachMessages,
    getBaseCoachMessages,
} from './coach-actions-messages.js';

let pendingGameMessage = null;
let bubble = null;
let textSpan = null;
let typingTimer = 0;

let messages = getBaseCoachMessages();
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

const applyRecommendations = async () => {
    const recs = await getLearningRecommendations();
    messages = buildCoachMessages({ recs, pendingGameMessage });
    pendingGameMessage = null;
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
        return;
    }
    if (action === 'hint') {
        const current = pendingGameMessage || messages[index] || messages[0] || "Explore the app to find new games!";
        const message = `Here's a tip: ${current}`;
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
