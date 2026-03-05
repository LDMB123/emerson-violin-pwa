import { loadRecordings } from '../persistence/loaders.js';
import { runRecordingExportAction } from '../utils/recording-export-feedback.js';
import { createAudioController } from '../utils/audio-utils.js';
import { isSoundEnabled as isPlaybackSoundEnabled } from '../utils/sound-state.js';
import { playRecordingWithSoundCheck } from '../utils/recording-playback-utils.js';
import { removeRecordingAtIndex, clearRecordingBlobs, saveRecordings } from './parent-recordings-data.js';

export const createParentRecordingsInteractions = ({ requestRender, setStatus }) => {
    const controller = createAudioController();
    const { stop: stopPlayback } = controller;
    const withConfirmedRecordingsMutation = async (message, mutate) => {
        const ok = window.confirm(message);
        if (!ok) return false;

        stopPlayback();
        const recordings = await loadRecordings();
        await mutate(recordings);
        await requestRender();
        return true;
    };

    const stop = () => stopPlayback();

    const bindRowActions = (descriptors) => {
        descriptors.forEach(({ recording, index, hasSource, playBtn, saveBtn, deleteBtn }) => {
            playBtn.addEventListener('click', async () => {
                if (!isPlaybackSoundEnabled() || !hasSource) return;
                await playRecordingWithSoundCheck({ recording, controller });
            });

            saveBtn.addEventListener('click', async () => {
                if (!hasSource || saveBtn.disabled) return;
                await runRecordingExportAction({
                    button: saveBtn,
                    recording,
                    index,
                    resetDelayMs: 800,
                });
            });

            deleteBtn.addEventListener('click', async () => {
                await withConfirmedRecordingsMutation('Delete this recording?', async (recordings) => {
                    await removeRecordingAtIndex(recordings, index);
                });
            });
        });
    };

    const clearAll = async () => {
        const cleared = await withConfirmedRecordingsMutation('Clear all saved recordings?', async (recordings) => {
            await clearRecordingBlobs(recordings);
            await saveRecordings([]);
        });
        if (!cleared) return;
        setStatus('All recordings cleared.');
    };

    return {
        bindRowActions,
        clearAll,
        stop,
    };
};
