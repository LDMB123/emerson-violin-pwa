const bubble = document.querySelector('[data-progress="coach-speech"]');
const buttons = Array.from(document.querySelectorAll('[data-coach-action]'));

const messages = [
    'Warm up with open strings and gentle bows.',
    'Play a slow G major scale with steady bow speed.',
    'Tap a steady rhythm, then match it on one note.',
    'Focus on bow straightness and relaxed fingers.',
    'Try a short song and keep your tempo calm.',
];

let index = 0;
if (bubble?.textContent?.trim()) {
    messages.unshift(bubble.textContent.trim());
}

const setMessage = (message) => {
    if (!bubble) return;
    bubble.textContent = message;
};

const handleAction = (action) => {
    if (!messages.length) return;
    if (action === 'next') {
        index = (index + 1) % messages.length;
        setMessage(messages[index]);
        return;
    }
    if (action === 'retry') {
        const current = messages[index] || messages[0];
        setMessage(`One more time: ${current}`);
    }
};

if (buttons.length) {
    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.dataset.coachAction;
            handleAction(action);
        });
    });
}
