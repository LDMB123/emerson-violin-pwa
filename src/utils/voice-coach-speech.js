import { isVoiceCoachEnabled } from './feature-flags.js';
import { speakMessage } from './speech-utils.js';

export const speakVoiceCoachMessage = (message, options = {}) => {
    return speakMessage({
        message,
        enabled: isVoiceCoachEnabled(),
        lang: 'en-US',
        ...options,
    });
};
