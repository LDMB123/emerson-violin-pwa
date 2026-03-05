import { resolveRecordingSource } from '../persistence/loaders.js';
import { playSourceWhenSoundEnabled } from './sound-state.js';

/**
 * Resolves a stored recording source and plays it only when sound is enabled.
 *
 * @param {Object} [options={}]
 * @param {Object|null|undefined} [options.recording] Recording metadata entry.
 * @param {Object|null|undefined} [options.controller] Audio controller used to
 * manage playback.
 * @param {(() => (void | Promise<void>)) | null} [options.beforePlay=null]
 * Optional hook that runs just before playback starts.
 * @returns {Promise<boolean>} True when playback starts, otherwise false.
 */
export const playRecordingWithSoundCheck = async (options = {}) => {
    const {
        recording,
        controller,
        beforePlay = null,
    } = options;
    if (!recording) return false;
    const source = await resolveRecordingSource(recording);
    if (!source) return false;
    return playSourceWhenSoundEnabled({
        controller,
        source,
        beforePlay,
    });
};
