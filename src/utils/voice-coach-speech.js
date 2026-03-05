import { isVoiceCoachEnabled } from './feature-flags.js';
import { speakMessage } from './speech-utils.js';

/**
 * Speaks a voice-coach message when the feature flag is enabled.
 *
 * @param {string} message
 * @param {Object} [options={}]
 * @returns {boolean}
 */
export const speakVoiceCoachMessage = (message, options = {}) => {
    return speakMessage({
        message,
        enabled: isVoiceCoachEnabled(),
        lang: 'en-US',
        ...options,
    });
};
