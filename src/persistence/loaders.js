import { getJSON, setJSON, getBlob } from './storage.js';
import { EVENTS_KEY, RECORDINGS_KEY } from './storage-keys.js';

export const loadEvents = async () => {
    const stored = await getJSON(EVENTS_KEY);
    return Array.isArray(stored) ? stored : [];
};

export const saveEvents = async (events) => {
    await setJSON(EVENTS_KEY, events);
};

export const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    return Array.isArray(stored) ? stored : [];
};

export const resolveRecordingSource = async (recording) => {
    if (!recording) return null;
    if (recording.dataUrl) return { url: recording.dataUrl, revoke: false };
    if (recording.blobKey) {
        const blob = await getBlob(recording.blobKey);
        if (!blob) return null;
        return { url: URL.createObjectURL(blob), revoke: true };
    }
    return null;
};
