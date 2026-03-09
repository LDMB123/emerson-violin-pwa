import { tryRun } from './safe-execution.js';

/**
 * Speaks a message with the Web Speech API when available and enabled.
 *
 * @param {Object} [options={}]
 * @param {string} [options.message='']
 * @param {boolean} [options.enabled=true]
 * @param {number} [options.rate=1]
 * @param {number} [options.pitch=1]
 * @param {string} [options.lang='en-US']
 * @param {boolean} [options.skipWhenHidden=true]
 * @param {boolean} [options.cancelFirst=true]
 * @returns {boolean}
 */
export const speakMessage = ({
    message = '',
    enabled = true,
    rate = 1,
    pitch = 1,
    lang = 'en-US',
    skipWhenHidden = true,
    cancelFirst = true,
} = {}) => {
    if (!enabled || !message) return false;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

    // Check parent settings for Voice Coach toggle
    try {
        const stored = localStorage.getItem('parent-settings-extended');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.voiceCoach === false) return false;
        }
    } catch { }

    if (skipWhenHidden && document.hidden) return false;

    return tryRun(() => {
        if (cancelFirst) {
            window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        window.speechSynthesis.speak(utterance);
    });
};

/**
 * Cancels queued or active speech synthesis.
 *
 * @returns {void}
 */
export const cancelSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
    } catch {
        // Ignore
    }
};
