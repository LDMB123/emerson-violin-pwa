/**
 * Returns a recording record rewritten to reference stored blob data instead of an inline data URL.
 */
export const withStoredRecordingBlob = (recording, blobKey, blob) => ({
    ...recording,
    dataUrl: null,
    blobKey,
    mimeType: blob?.type || recording?.mimeType || 'audio/webm',
});
