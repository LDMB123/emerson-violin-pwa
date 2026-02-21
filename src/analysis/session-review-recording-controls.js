import { getBlob } from '../persistence/storage.js';
import { resolveRecordingSource } from '../persistence/loaders.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';
import { filterSongEvents, getRecentEvents } from '../utils/session-review-utils.js';
import { exportRecording } from '../utils/recording-export.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { createAudioController } from '../utils/audio-utils.js';
import { buildRecordingSlotState, applyRecordingSlotState } from '../utils/analysis-recordings-utils.js';

export const createSessionReviewRecordingController = () => {
    const controller = createAudioController();
    const { audio: playbackAudio, stop: stopPlayback } = controller;

    let recordingEls = [];
    let currentRecordings = [];
    let soundChangeHandler = null;

    const updatePlaybackButtons = (enabled) => {
        recordingEls.forEach((el) => {
            const button = el.querySelector('.recording-play');
            if (!button || button.dataset.recordingAvailable !== 'true') return;
            button.disabled = !enabled;
        });
    };

    const syncPlaybackSound = (enabled = isSoundEnabled()) => {
        playbackAudio.muted = !enabled;
        updatePlaybackButtons(enabled);
    };

    const ensureSoundListener = () => {
        if (soundChangeHandler) return;
        soundChangeHandler = (event) => {
            const enabled = event.detail?.enabled;
            syncPlaybackSound(enabled);
            if (!enabled) stopPlayback();
        };
        document.addEventListener(SOUNDS_CHANGE, soundChangeHandler);
    };

    const bindRecordingPlayback = () => {
        syncPlaybackSound();
        ensureSoundListener();

        recordingEls.forEach((el, index) => {
            const button = el.querySelector('.recording-play');
            if (!button || button.dataset.bound === 'true') return;

            button.dataset.bound = 'true';
            button.addEventListener('click', async () => {
                if (!isSoundEnabled()) return;

                const recording = currentRecordings[index];
                if (!recording?.dataUrl && !recording?.blobKey) return;

                const source = await resolveRecordingSource(recording);
                if (!source) return;

                syncPlaybackSound();
                if (!isSoundEnabled()) return;
                await controller.playSource(source);
            });
        });
    };

    const bindRecordingExport = () => {
        recordingEls.forEach((el, index) => {
            const button = el.querySelector('.recording-save');
            if (!button || button.dataset.exportBound === 'true') return;

            button.dataset.exportBound = 'true';
            button.addEventListener('click', async () => {
                if (button.disabled) return;

                const recording = currentRecordings[index];
                if (!recording?.dataUrl && !recording?.blobKey) return;

                button.disabled = true;
                const original = button.textContent;
                button.textContent = '…';

                try {
                    const blob = recording.blobKey ? await getBlob(recording.blobKey) : null;
                    await exportRecording(recording, index, blob);
                    button.textContent = '✓';
                } catch {
                    button.textContent = '!';
                } finally {
                    setTimeout(() => {
                        button.textContent = original || '⬇';
                        button.disabled = false;
                    }, 1200);
                }
            });
        });
    };

    const applyRecordings = ({ events, songMap, recordings, recordingElements }) => {
        recordingEls = Array.isArray(recordingElements) ? recordingElements : [];
        const recentRecordings = Array.isArray(recordings) ? recordings.slice(0, 2) : [];
        currentRecordings = recentRecordings;

        const songEvents = filterSongEvents(events);
        const recent = getRecentEvents(songEvents, 2);
        const soundEnabled = isSoundEnabled();

        recordingEls.forEach((el, index) => {
            const slotState = buildRecordingSlotState({
                recording: recentRecordings[index],
                item: recent[index],
                index,
                soundEnabled,
                songMap,
            });
            applyRecordingSlotState(
                {
                    playButton: el.querySelector('.recording-play'),
                    saveButton: el.querySelector('.recording-save'),
                    titleEl: el.querySelector('[data-analysis="recording-title"]'),
                    subEl: el.querySelector('[data-analysis="recording-sub"]'),
                },
                slotState,
            );
        });

        bindRecordingPlayback();
        bindRecordingExport();
    };

    const stop = () => stopPlayback();

    const dispose = () => {
        if (soundChangeHandler) {
            document.removeEventListener(SOUNDS_CHANGE, soundChangeHandler);
            soundChangeHandler = null;
        }
        stopPlayback();
        recordingEls = [];
        currentRecordings = [];
    };

    return {
        applyRecordings,
        stop,
        dispose,
    };
};
