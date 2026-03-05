import { getBlob } from '../persistence/storage.js';
import { exportRecording } from './recording-export.js';

const runRecordingExportWithFeedback = async ({
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

/**
 * Runs recording export with temporary button feedback.
 *
 * @param {Object} [options={}]
 * @param {HTMLButtonElement | null} [options.button=null]
 * @param {Object | null} [options.recording=null]
 * @param {number} [options.index=0]
 * @param {number} [options.resetDelayMs=1000]
 * @returns {Promise<boolean>}
 */
export const runRecordingExportAction = async (options = {}) => {
    const {
        button = null,
        recording = null,
        index = 0,
        resetDelayMs = 1000,
    } = options;
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
