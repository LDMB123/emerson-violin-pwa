const hasSavedRecording = (recording) => Boolean(recording?.dataUrl || recording?.blobKey);

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
        return {
            title: 'Recording',
            sub: 'No recent play',
            playDisabled: true,
            playAvailable: false,
            saveDisabled: true,
            recordingIndex: String(index),
        };
    }

    const name = songMap?.get?.(item.id) || item.id;
    return {
        title: 'Recent Play',
        sub: `${name} · ${Math.round(item.accuracy || 0)}%`,
        playDisabled: true,
        playAvailable: false,
        saveDisabled: true,
        recordingIndex: String(index),
    };
};

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
