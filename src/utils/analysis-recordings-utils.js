const hasSavedRecording = (recording) => Boolean(recording?.dataUrl || recording?.blobKey);

const createUnavailableRecordingState = ({ title, sub, index }) => ({
    title,
    sub,
    playDisabled: true,
    playAvailable: false,
    saveDisabled: true,
    recordingIndex: String(index),
});

/**
 * Builds the display state for one analysis recording slot.
 *
 * @param {Object} options
 * @param {Object | null | undefined} options.recording
 * @param {Object | null | undefined} options.item
 * @param {number} options.index
 * @param {boolean} options.soundEnabled
 * @param {Map<string, string> | null | undefined} options.songMap
 * @returns {{ title: string, sub: string, playDisabled: boolean, playAvailable: boolean, saveDisabled: boolean, recordingIndex: string }}
 */
export const buildRecordingSlotState = ({ recording, item, index, soundEnabled, songMap }) => {
    if (hasSavedRecording(recording)) {
        return {
            title: recording.title || `Recording ${index + 1}`,
            sub: `Saved clip · ${recording.duration || 0}s`,
            playDisabled: !soundEnabled,
            playAvailable: true,
            saveDisabled: false,
            recordingIndex: String(index),
        };
    }

    if (!item) {
        return createUnavailableRecordingState({
            title: 'Recording',
            sub: 'No recent play',
            index,
        });
    }

    const name = songMap?.get?.(item.id) || item.id;
    return createUnavailableRecordingState({
        title: 'Recent Play',
        sub: `${name} · ${Math.round(item.accuracy || 0)}%`,
        index,
    });
};

/**
 * Applies a recording slot state to its DOM elements.
 *
 * @param {{ playButton?: HTMLElement | null, saveButton?: HTMLElement | null, titleEl?: HTMLElement | null, subEl?: HTMLElement | null }} elements
 * @param {{ title: string, sub: string, playDisabled: boolean, playAvailable: boolean, saveDisabled: boolean, recordingIndex: string }} state
 * @returns {void}
 */
export const applyRecordingSlotState = (elements, state) => {
    const { playButton, saveButton, titleEl, subEl } = elements;

    if (titleEl) titleEl.textContent = state.title;
    if (subEl) subEl.textContent = state.sub;

    if (playButton) {
        playButton.disabled = state.playDisabled;
        playButton.dataset.recordingIndex = state.recordingIndex;
        if (state.playAvailable) {
            playButton.dataset.recordingAvailable = 'true';
        } else {
            delete playButton.dataset.recordingAvailable;
        }
    }

    if (saveButton) {
        saveButton.disabled = state.saveDisabled;
        saveButton.dataset.recordingIndex = state.recordingIndex;
    }
};
