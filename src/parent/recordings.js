import { whenReady } from '../utils/dom-ready.js';
import { setJSON, getBlob, removeBlob } from '../persistence/storage.js';
import { loadRecordings, resolveRecordingSource } from '../persistence/loaders.js';
import { exportRecording } from '../utils/recording-export.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { clamp } from '../utils/math.js';
import { RECORDINGS_KEY } from '../persistence/storage-keys.js';
import { RECORDINGS_UPDATED, SOUNDS_CHANGE } from '../utils/event-names.js';
import { createAudioController } from '../utils/audio-utils.js';

const listEl = document.querySelector('[data-parent-recordings]');
const statusEl = document.querySelector('[data-parent-recordings-status]');
const clearButton = document.querySelector('[data-parent-clear-recordings]');
const { audio: playbackAudio, stop: stopPlayback, setUrl: setPlaybackUrl } = createAudioController();

const updateStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const saveRecordings = async (recordings) => {
    await setJSON(RECORDINGS_KEY, recordings);
    window.dispatchEvent(new Event(RECORDINGS_UPDATED));
};

const formatDuration = (seconds) => {
    const value = Number.isFinite(seconds) ? Math.round(seconds) : 0;
    const minutes = Math.floor(value / 60);
    const remainder = value % 60;
    if (!minutes) return `${remainder}s`;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const buildRow = (recording, index) => {
    const row = document.createElement('div');
    row.className = 'parent-recording-item';
    row.dataset.recordingIndex = String(index);

    const playBtn = document.createElement('button');
    playBtn.className = 'recording-play';
    playBtn.type = 'button';
    playBtn.setAttribute('aria-label', 'Play recording');
    playBtn.textContent = '\u25B6';

    const info = document.createElement('div');
    info.className = 'recording-info';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'recording-title';
    const subDiv = document.createElement('div');
    subDiv.className = 'recording-sub';
    info.appendChild(titleDiv);
    info.appendChild(subDiv);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'recording-save';
    saveBtn.type = 'button';
    saveBtn.setAttribute('aria-label', 'Save recording');
    saveBtn.textContent = '\u2B07';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'recording-delete';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', 'Delete recording');
    deleteBtn.textContent = '\u2715';

    row.appendChild(playBtn);
    row.appendChild(info);
    row.appendChild(saveBtn);
    row.appendChild(deleteBtn);

    titleDiv.textContent = recording.title || `Recording ${index + 1}`;
    if (subDiv) {
        let createdAt = '';
        if (recording.createdAt) {
            const stamp = new Date(recording.createdAt);
            if (!Number.isNaN(stamp.getTime())) {
                createdAt = stamp.toLocaleDateString();
            }
        }
        const parts = [`Duration ${formatDuration(recording.duration || 0)}`];
        if (createdAt) parts.push(createdAt);
        subDiv.textContent = parts.join(' · ');
    }

    const hasSource = Boolean(recording.dataUrl || recording.blobKey);
    if (playBtn) {
        playBtn.disabled = !isSoundEnabled() || !hasSource;
        playBtn.addEventListener('click', async () => {
            if (!isSoundEnabled()) return;
            if (!hasSource) return;
            const source = await resolveRecordingSource(recording);
            if (!source) return;
            stopPlayback();
            setPlaybackUrl(source.revoke ? source.url : '');
            playbackAudio.src = source.url;
            if (!isSoundEnabled()) return;
            playbackAudio.play().catch(() => {});
            if (source.revoke) {
                playbackAudio.addEventListener('ended', () => stopPlayback(), { once: true });
            }
        });
    }

    if (saveBtn) {
        saveBtn.disabled = !hasSource;
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
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const ok = window.confirm('Delete this recording?');
            if (!ok) return;
            stopPlayback();
            const recordings = await loadRecordings();
            recordings.splice(index, 1);
            if (recording.blobKey) {
                await removeBlob(recording.blobKey);
            }
            await saveRecordings(recordings);
            render();
        });
    }

    return row;
};

const render = async () => {
    if (!listEl) return;
    const recordings = await loadRecordings();
    listEl.replaceChildren();

    if (clearButton) clearButton.disabled = !recordings.length;

    if (!recordings.length) {
        updateStatus('No recordings saved yet.');
        return;
    }

    const maxItems = clamp(recordings.length, 1, 4);
    recordings.slice(0, maxItems).forEach((recording, index) => {
        listEl.appendChild(buildRow(recording, index));
    });
    updateStatus(`Showing ${Math.min(recordings.length, maxItems)} of ${recordings.length} recordings.`);
};

const clearRecordings = async () => {
    const ok = window.confirm('Clear all saved recordings?');
    if (!ok) return;
    stopPlayback();
    const recordings = await loadRecordings();
    await Promise.allSettled(recordings.map((recording) => removeBlob(recording.blobKey)));
    await saveRecordings([]);
    render();
    updateStatus('All recordings cleared.');
};

const init = () => {
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            clearRecordings();
        });
    }

    render();
    const handleUpdate = () => {
        stopPlayback();
        render();
    };
    window.addEventListener(RECORDINGS_UPDATED, handleUpdate);
    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false) {
            stopPlayback();
        }
        render();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopPlayback();
    });
    window.addEventListener('pagehide', () => {
        stopPlayback();
    });
};

whenReady(init);
