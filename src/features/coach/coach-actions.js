import { getLearningRecommendations } from '@core/ml/recommendations.js';

const bubble = document.querySelector('[data-progress="coach-speech"]');
const buttons = Array.from(document.querySelectorAll('[data-coach-action]'));
const voiceToggle = document.querySelector('#setting-voice');

const baseMessages = [
    'Warm up with open strings and gentle bows.',
    'Play a slow G major scale with steady bow speed.',
    'Tap a steady rhythm, then match it on one note.',
    'Focus on bow straightness and relaxed fingers.',
    'Try a short song and keep your tempo calm.',
];

let messages = [...baseMessages];
let index = 0;
if (bubble?.textContent?.trim()) {
    baseMessages.unshift(bubble.textContent.trim());
    messages = [...baseMessages];
}

const setMessage = (message) => {
    if (!bubble) return;
    bubble.textContent = message;
};

const canSpeak = () => Boolean(voiceToggle?.checked)
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;

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

const buildMessages = (recs) => {
    const next = [...baseMessages];
    if (recs?.coachMessage) next.unshift(recs.coachMessage);
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
    if (bubble && bubble.dataset.coachAuto !== 'false') {
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

const handleLessonStep = (event) => {
    if (!bubble) return;
    const detail = event.detail || {};
    const step = detail.step;
    if (!step) return;
    const index = Number.isFinite(detail.index) ? detail.index : 0;
    const total = Number.isFinite(detail.total) ? detail.total : 1;
    let message = '';
    if (detail.state === 'start') {
        message = `Step ${index + 1} of ${total}: ${step.label || 'Practice step'}. ${step.cue || ''}`.trim();
    } else if (detail.state === 'complete') {
        message = `Nice work! Step ${index + 1} complete.`;
    } else if (detail.state === 'pause') {
        message = `Paused on step ${index + 1}. Resume when you're ready.`;
    }
    if (message) {
        bubble.dataset.coachAuto = 'false';
        setMessage(message);
        speakMessage(message);
    }
};

const handleLessonComplete = () => {
    if (!bubble) return;
    const message = 'Lesson complete! Take a breath, then choose a new plan.';
    bubble.dataset.coachAuto = 'false';
    setMessage(message);
    speakMessage(message);
};

if (buttons.length) {
    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.coachAction;
            handleAction(action);
            if (bubble) bubble.dataset.coachAuto = 'false';
        });
    });
}

applyRecommendations();

document.addEventListener('panda:ml-update', applyRecommendations);
document.addEventListener('panda:lesson-step', handleLessonStep);
document.addEventListener('panda:lesson-complete', handleLessonComplete);

if (voiceToggle && 'speechSynthesis' in window) {
    voiceToggle.addEventListener('change', () => {
        if (!voiceToggle.checked) {
            window.speechSynthesis.cancel();
        }
    });
}
