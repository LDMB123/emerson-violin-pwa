import { setJSON, setBlob, removeBlob } from '../persistence/storage.js';
import { loadRecordings } from '../persistence/loaders.js';
import { dataUrlToBlob, blobToDataUrl, createBlobKey as createRecordingBlobKey } from '../utils/recording-export.js';
import { RECORDINGS_KEY } from '../persistence/storage-keys.js';
import { RECORDINGS_UPDATED } from '../utils/event-names.js';

const dispatchRecordingsUpdated = () => {
    window.dispatchEvent(new Event(RECORDINGS_UPDATED));
};

const pruneBlobs = async (previous, next) => {
    const keep = new Set(next.map((entry) => entry.blobKey).filter(Boolean));
    const removals = previous
        .map((entry) => entry.blobKey)
        .filter((key) => key && !keep.has(key));
    if (!removals.length) return;
    await Promise.allSettled(removals.map((key) => removeBlob(key)));
};

export const migrateRecordingsToBlobs = async () => {
    const recordings = await loadRecordings();
    const candidates = recordings.filter((recording) => recording?.dataUrl && !recording?.blobKey);
    if (!candidates.length) return;
    const next = [...recordings];
    let changed = false;

    for (let i = 0; i < recordings.length; i += 1) {
        const recording = recordings[i];
        if (!recording?.dataUrl || recording?.blobKey) continue;
        try {
            const blob = await dataUrlToBlob(recording.dataUrl);
            const blobKey = createRecordingBlobKey(recording.id || 'recording');
            const stored = await setBlob(blobKey, blob);
            if (!stored) continue;
            next[i] = {
                ...recording,
                dataUrl: null,
                blobKey,
                mimeType: blob.type || recording.mimeType || 'audio/webm',
            };
            changed = true;
        } catch {
            // Ignore individual migration failures.
        }
    }

    if (!changed) return;
    await setJSON(RECORDINGS_KEY, next);
    dispatchRecordingsUpdated();
};

export const saveRecording = async ({ songId, duration, blob, getSongTitle, maxRecordings }) => {
    const recordings = await loadRecordings();

    let blobKey = null;
    if (blob) {
        blobKey = createRecordingBlobKey(songId);
        const stored = await setBlob(blobKey, blob);
        if (!stored) blobKey = null;
    }
    const dataUrl = blobKey ? null : await blobToDataUrl(blob);
    const entry = {
        id: songId,
        title: getSongTitle(songId),
        duration: Math.round(duration || 0),
        createdAt: new Date().toISOString(),
        dataUrl,
        blobKey,
        mimeType: blob?.type || 'audio/webm',
    };
    const next = [entry, ...recordings].slice(0, maxRecordings);
    await setJSON(RECORDINGS_KEY, next);
    await pruneBlobs(recordings, next);
    dispatchRecordingsUpdated();
};
