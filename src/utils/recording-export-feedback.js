import { getBlob } from '../persistence/storage.js';
import { exportRecording } from './recording-export.js';

export const runRecordingExportWithFeedback = async ({
    button = null,
    onExport = null,
    pendingLabel = '…',
    successLabel = '✓',
    errorLabel = '!',
    fallbackLabel = '⬇',
    resetDelayMs = 1000,
} = {}) => {
    if (!button || typeof onExport !== 'function') return false;

    button.disabled = true;
    const original = button.textContent;
    button.textContent = pendingLabel;

    try {
        await onExport();
        button.textContent = successLabel;
        return true;
    } catch {
        button.textContent = errorLabel;
        return false;
    } finally {
        setTimeout(() => {
            button.textContent = original || fallbackLabel;
            button.disabled = false;
        }, resetDelayMs);
    }
};

export const runRecordingExportAction = async ({
    button = null,
    recording = null,
    index = 0,
    resetDelayMs = 1000,
} = {}) => {
    if (!recording?.dataUrl && !recording?.blobKey) return false;
    return runRecordingExportWithFeedback({
        button,
        resetDelayMs,
        onExport: async () => {
            const blob = recording.blobKey ? await getBlob(recording.blobKey) : null;
            await exportRecording(recording, index, blob);
        },
    });
};
