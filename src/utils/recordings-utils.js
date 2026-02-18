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

