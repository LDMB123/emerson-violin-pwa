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
    if (skipWhenHidden && document.hidden) return false;

    try {
        if (cancelFirst) {
            window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        window.speechSynthesis.speak(utterance);
        return true;
    } catch {
        return false;
    }
};

export const cancelSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
    } catch {
        // Ignore
    }
};

