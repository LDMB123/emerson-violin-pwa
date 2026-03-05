export const withStoredRecordingBlob = (recording, blobKey, blob) => ({
    ...recording,
    dataUrl: null,
    blobKey,
    mimeType: blob?.type || recording?.mimeType || 'audio/webm',
});
