const isCheckedToggle = (selector) => {
    const toggle = document.querySelector(selector);
    if (!toggle || typeof toggle.checked !== 'boolean') return null;
    return toggle.checked;
};

const isDatasetOn = (key) => document.documentElement.dataset[key] === 'on';

/**
 * Returns whether voice-coach speech is enabled.
 *
 * @returns {boolean}
 */
export const isVoiceCoachEnabled = () => {
    if (document.documentElement.dataset.voiceCoach) {
        return isDatasetOn('voiceCoach');
    }
    const toggleValue = isCheckedToggle('#setting-voice');
    return Boolean(toggleValue);
};

/**
 * Returns whether recording features are enabled.
 *
 * @returns {boolean}
 */
export const isRecordingEnabled = () => {
    if (document.documentElement.dataset.recordings) {
        return isDatasetOn('recordings');
    }
    const toggleValue = isCheckedToggle('#setting-recordings');
    return Boolean(toggleValue);
};
