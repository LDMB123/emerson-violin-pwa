import { resolveRecordingSource } from '../persistence/loaders.js';
import { playSourceWhenSoundEnabled } from './sound-state.js';

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
