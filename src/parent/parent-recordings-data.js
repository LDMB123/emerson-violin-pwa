import { setJSON, removeBlob } from '../persistence/storage.js';
import { RECORDINGS_UPDATED } from '../utils/event-names.js';
import { RECORDINGS_KEY } from '../persistence/storage-keys.js';

/** Persists the recordings list and broadcasts a recordings-updated event. */
export const saveRecordings = async (recordings) => {
    await setJSON(RECORDINGS_KEY, recordings);
    window.dispatchEvent(new Event(RECORDINGS_UPDATED));
};

/** Returns the slice of recordings that should be shown in the parent summary UI. */
export const getVisibleRecordings = (recordings, maxVisible = 4) => {
    return recordings.slice(0, maxVisible);
};

/** Removes one recording entry and deletes its stored blob when present. */
export const removeRecordingAtIndex = async (recordings, index) => {
    const nextRecordings = Array.isArray(recordings) ? recordings.slice() : [];
    const [removed] = nextRecordings.splice(index, 1);
    if (removed?.blobKey) {
        await removeBlob(removed.blobKey);
    }
    await saveRecordings(nextRecordings);
    return nextRecordings;
};

/** Deletes all blob payloads referenced by a recordings collection. */
export const clearRecordingBlobs = async (recordings) =>
    Promise.allSettled(
        recordings.map((recording) => (recording?.blobKey ? removeBlob(recording.blobKey) : Promise.resolve())),
    );
