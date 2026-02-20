import { setJSON, removeBlob } from '../persistence/storage.js';
import { RECORDINGS_KEY } from '../persistence/storage-keys.js';
import { RECORDINGS_UPDATED } from '../utils/event-names.js';
import { clamp } from '../utils/math.js';

export const saveRecordings = async (recordings) => {
    await setJSON(RECORDINGS_KEY, recordings);
    window.dispatchEvent(new Event(RECORDINGS_UPDATED));
};

export const getVisibleRecordings = (recordings, maxVisible = 4) => {
    const maxItems = clamp(recordings.length, 1, maxVisible);
    return recordings.slice(0, maxItems);
};

export const removeRecordingAtIndex = async (recordings, index) => {
    const nextRecordings = Array.isArray(recordings) ? recordings.slice() : [];
    const [removed] = nextRecordings.splice(index, 1);
    if (removed?.blobKey) {
        await removeBlob(removed.blobKey);
    }
    await saveRecordings(nextRecordings);
    return nextRecordings;
};

export const clearRecordingBlobs = async (recordings) =>
    Promise.allSettled(
        recordings.map((recording) => (recording?.blobKey ? removeBlob(recording.blobKey) : Promise.resolve())),
    );
