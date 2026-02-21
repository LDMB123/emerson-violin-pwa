import { getBlob } from '../persistence/storage.js';
import { loadRecordings, resolveRecordingSource } from '../persistence/loaders.js';
import { exportRecording } from '../utils/recording-export.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { createAudioController } from '../utils/audio-utils.js';
import { removeRecordingAtIndex, clearRecordingBlobs, saveRecordings } from './parent-recordings-data.js';

export const createParentRecordingsInteractions = ({ requestRender, setStatus }) => {
    const controller = createAudioController();
    const { stop: stopPlayback } = controller;

    const stop = () => stopPlayback();

    const bindRowActions = (descriptors) => {
        descriptors.forEach(({ recording, index, hasSource, playBtn, saveBtn, deleteBtn }) => {
            playBtn.addEventListener('click', async () => {
                if (!isSoundEnabled() || !hasSource) return;
                const source = await resolveRecordingSource(recording);
                if (!source) return;

                if (!isSoundEnabled()) return;
                await controller.playSource(source);
            });

            saveBtn.addEventListener('click', async () => {
                if (!hasSource) return;
                saveBtn.disabled = true;
                const original = saveBtn.textContent;
                saveBtn.textContent = '…';
                try {
                    const blob = recording.blobKey ? await getBlob(recording.blobKey) : null;
                    await exportRecording(recording, index, blob);
                    saveBtn.textContent = '✓';
                } catch {
                    saveBtn.textContent = '!';
                } finally {
                    setTimeout(() => {
                        saveBtn.textContent = original || '⬇';
                        saveBtn.disabled = false;
                    }, 800);
                }
            });

            deleteBtn.addEventListener('click', async () => {
                const ok = window.confirm('Delete this recording?');
                if (!ok) return;

                stopPlayback();
                const recordings = await loadRecordings();
                await removeRecordingAtIndex(recordings, index);
                await requestRender();
            });
        });
    };

    const clearAll = async () => {
        const ok = window.confirm('Clear all saved recordings?');
        if (!ok) return;

        stopPlayback();
        const recordings = await loadRecordings();
        await clearRecordingBlobs(recordings);
        await saveRecordings([]);
        await requestRender();
        setStatus('All recordings cleared.');
    };

    return {
        bindRowActions,
        clearAll,
        stop,
    };
};
