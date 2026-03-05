import { SOUNDS_CHANGE } from '../utils/event-names.js';
import { getRecentEvents } from '../utils/session-review-utils.js';
import { createAudioController } from '../utils/audio-utils.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { buildRecordingSlotState, applyRecordingSlotState } from '../utils/analysis-recordings-utils.js';
import { runRecordingExportAction } from '../utils/recording-export-feedback.js';
import { playRecordingWithSoundCheck } from '../utils/recording-playback-utils.js';

/** Creates the recording playback/export controller used by the session review view. */
export const createSessionReviewRecordingController = () => {
    const controller = createAudioController();
    const { audio: playbackAudio, stop: stopPlayback } = controller;

    let recordingEls = [];
    let currentRecordings = [];
    let soundChangeHandler = null;

    const getValidRecording = (index) => {
        const recording = currentRecordings[index];
        if (!recording?.dataUrl && !recording?.blobKey) return null;
        return recording;
    };

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

    const withRecordingAtIndex = async (index, action) => {
        const recording = getValidRecording(index);
        if (!recording) return;
        await action(recording);
    };
    const forEachRecordingEl = (action) => {
        recordingEls.forEach((el, index) => {
            action(el, index);
        });
    };

    const bindRecordingPlayback = () => {
        syncPlaybackSound();
        ensureSoundListener();

        forEachRecordingEl((el, index) => {
            const button = el.querySelector('.recording-play');
            if (!button || button.dataset.bound === 'true') return;

            button.dataset.bound = 'true';
            button.addEventListener('click', async () => {
                if (!isSoundEnabled()) return;
                async function playSelectedRecording(recording) {
                    await playRecordingWithSoundCheck({
                        recording,
                        controller,
                        beforePlay: syncPlaybackSound,
                    });
                }
                await withRecordingAtIndex(index, playSelectedRecording);
            });
        });
    };

    const bindRecordingExport = () => {
        forEachRecordingEl((el, index) => {
            const button = el.querySelector('.recording-save');
            if (!button || button.dataset.exportBound === 'true') return;

            button.dataset.exportBound = 'true';
            button.addEventListener('click', async () => {
                if (button.disabled) return;
                await withRecordingAtIndex(index, (recording) => runRecordingExportAction({
                        button,
                        recording,
                        index,
                        resetDelayMs: 1200,
                    }));
            });
        });
    };

    const applyRecordings = ({ events, songMap, recordings, recordingElements }) => {
        recordingEls = Array.isArray(recordingElements) ? recordingElements : [];
        const recentRecordings = Array.isArray(recordings) ? recordings.slice(0, 2) : [];
        currentRecordings = recentRecordings;

        const songEvents = Array.isArray(events) ? events.filter((event) => event.type === 'song') : [];
        const recent = getRecentEvents(songEvents, 2);
        const soundEnabled = isSoundEnabled();

        forEachRecordingEl((el, index) => {
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
