export const getSongIdFromViewId = (viewId) => {
    if (!viewId || !viewId.startsWith('view-song-')) return '';
    return viewId.replace('view-song-', '');
};

export const getSongIdFromHash = (hash) => {
    if (!hash || !hash.startsWith('#view-song-')) return '';
    return hash.replace('#view-song-', '');
};

export const createBlobKey = (songId) => {
    if (globalThis.crypto?.randomUUID) {
        return `recording:${songId}:${crypto.randomUUID()}`;
    }
    return `recording:${songId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
};

export const isRecordingKey = (key) => {
    return typeof key === 'string' && key.startsWith('recording:');
};

export const extractRecordingMetadata = (recording) => {
    return {
        title: recording?.title || 'Practice Clip',
        duration: recording?.duration || 0,
        timestamp: recording?.timestamp || Date.now(),
        songId: recording?.songId || '',
    };
};

export const validateRecording = (recording) => {
    if (!recording) return false;
    return Boolean(recording.dataUrl || recording.blobKey);
};

export const filterValidRecordings = (recordings) => {
    return Array.isArray(recordings) ? recordings.filter(validateRecording) : [];
};

export const limitRecordings = (recordings, maxCount = 4) => {
    return recordings.slice(0, maxCount);
};

export const pruneOldRecordings = (recordings, maxCount = 4) => {
    if (recordings.length <= maxCount) return recordings;
    const sorted = [...recordings].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted.slice(0, maxCount);
};
