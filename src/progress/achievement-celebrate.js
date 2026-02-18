import { ACHIEVEMENT_UNLOCKED } from '../utils/event-names.js';

const dialog = document.getElementById('achievement-modal');
const badgeImg = document.getElementById('achievement-badge-img');
const badgeFallback = document.getElementById('achievement-badge-fallback');
const badgeName = document.getElementById('achievement-badge-name');
const badgeArt = document.getElementById('achievement-badge-art');
const yayBtn = document.getElementById('achievement-yay');

if (!dialog) throw new Error('[achievement-celebrate] dialog element not found');

const FALLBACK_EMOJI = {
    first_note:    '♪',
    streak_7:      '🔥',
    level_5:       '★',
    practice_100:  '⏱',
    pitch_perfect: '🎵',
    rhythm_master: '🥁',
    bow_hero:      '🎻',
    ear_training:  '👂',
    all_games:     '🎮',
};

const canSpeak = () =>
    Boolean(document.querySelector('#setting-voice')?.checked)
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;

const speakBadge = (name) => {
    if (!canSpeak() || document.hidden) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`New badge! ${name}!`);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    } catch {
        // Ignore speech failures
    }
};

/** Queue of { id, name, artSrc } waiting to be shown. */
const queue = [];
let isOpen = false;

const populate = ({ id, name, artSrc }) => {
    if (badgeName) badgeName.textContent = name;
    if (badgeArt) badgeArt.setAttribute('aria-label', name);

    const emoji = FALLBACK_EMOJI[id] || '★';
    if (artSrc && badgeImg) {
        badgeImg.src = artSrc;
        badgeImg.alt = name;
        if (badgeFallback) badgeFallback.textContent = '';
        if (badgeFallback) badgeFallback.hidden = true;
    } else {
        if (badgeImg) badgeImg.src = '';
        if (badgeFallback) {
            badgeFallback.textContent = emoji;
            badgeFallback.hidden = false;
        }
    }
};

const showNext = () => {
    if (!queue.length || !dialog) return;
    const item = queue.shift();
    populate(item);
    dialog.showModal();
    isOpen = true;
    speakBadge(item.name);
};

const close = () => {
    if (!dialog) return;
    dialog.close();
};

if (yayBtn) {
    yayBtn.addEventListener('click', () => close());
}

dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
});

dialog.addEventListener('close', () => {
    isOpen = false;
    if (queue.length) showNext();
});

document.addEventListener(ACHIEVEMENT_UNLOCKED, (e) => {
    const { id, name, artSrc } = e.detail || {};
    if (!id || !name) return;
    queue.push({ id, name, artSrc: artSrc || null });
    if (!isOpen) showNext();
});
