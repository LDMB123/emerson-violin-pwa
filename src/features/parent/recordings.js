import { getJSON, setJSON, getBlob, removeBlob } from '@core/persistence/storage.js';
import { exportRecording } from '@core/utils/recording-export.js';

const RECORDINGS_KEY = 'panda-violin:recordings:v1';

const listEl = document.querySelector('[data-parent-recordings]');
const statusEl = document.querySelector('[data-parent-recordings-status]');
const clearButton = document.querySelector('[data-parent-clear-recordings]');
const rowTemplate = document.querySelector('#parent-recording-row');
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';
const playbackAudio = new Audio();
let playbackUrl = '';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

playbackAudio.preload = 'none';

const updateStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    return Array.isArray(stored) ? stored : [];
};

const saveRecordings = async (recordings) => {
    await setJSON(RECORDINGS_KEY, recordings);
    window.dispatchEvent(new Event('panda:recordings-updated'));
};

const formatDuration = (seconds) => {
    const value = Number.isFinite(seconds) ? Math.round(seconds) : 0;
    const minutes = Math.floor(value / 60);
    const remainder = value % 60;
    if (!minutes) return `${remainder}s`;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const resolveRecordingSource = async (recording) => {
    if (!recording) return null;
    if (recording.dataUrl) return { url: recording.dataUrl, revoke: false };
    if (recording.blobKey) {
        const blob = await getBlob(recording.blobKey);
        if (!blob) return null;
        return { url: URL.createObjectURL(blob), revoke: true };
    }
    return null;
};

const stopPlayback = () => {
    if (!playbackAudio) return;
    if (!playbackAudio.paused) {
        playbackAudio.pause();
        playbackAudio.currentTime = 0;
    }
    if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl);
        playbackUrl = '';
    }
};

const cloneRow = () => {
    if (!rowTemplate?.content) return null;
    const fragment = rowTemplate.content.cloneNode(true);
    return fragment.firstElementChild;
};

const buildRow = (recording, index) => {
    const row = cloneRow();
    if (!row) return null;
    row.dataset.recordingIndex = String(index);

    const titleEl = row.querySelector('.recording-title');
    const subEl = row.querySelector('.recording-sub');
    if (titleEl) titleEl.textContent = recording.title || `Recording ${index + 1}`;
    if (subEl) {
        let createdAt = '';
        if (recording.createdAt) {
            const stamp = new Date(recording.createdAt);
            if (!Number.isNaN(stamp.getTime())) {
                createdAt = stamp.toLocaleDateString();
            }
        }
        const parts = [`Duration ${formatDuration(recording.duration || 0)}`];
        if (createdAt) parts.push(createdAt);
        subEl.textContent = parts.join(' · ');
    }

    const hasSource = Boolean(recording.dataUrl || recording.blobKey);
    const playButton = row.querySelector('.recording-play');
    if (playButton) {
        playButton.disabled = !isSoundEnabled() || !hasSource;
        playButton.addEventListener('click', async () => {
            if (!isSoundEnabled()) return;
            if (!hasSource) return;
            const source = await resolveRecordingSource(recording);
            if (!source) return;
            stopPlayback();
            playbackAudio.src = source.url;
            playbackAudio.play().catch(() => {});
            if (source.revoke) {
                playbackUrl = source.url;
                playbackAudio.addEventListener('ended', () => stopPlayback(), { once: true });
            }
        });
    }

    const saveButton = row.querySelector('.recording-save');
    if (saveButton) {
        saveButton.disabled = !hasSource;
        saveButton.addEventListener('click', async () => {
            if (!hasSource) return;
            saveButton.disabled = true;
            const original = saveButton.textContent;
            saveButton.textContent = '…';
            try {
                const blob = recording.blobKey ? await getBlob(recording.blobKey) : null;
                await exportRecording(recording, index, blob);
                saveButton.textContent = '✓';
            } catch {
                saveButton.textContent = '!';
            } finally {
                setTimeout(() => {
                    saveButton.textContent = original || '⬇';
                    saveButton.disabled = false;
                }, 1200);
            }
        });
    }

    const deleteButton = row.querySelector('.recording-delete');
    if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
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
        const row = buildRow(recording, index);
        if (row) listEl.appendChild(row);
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
    window.addEventListener('panda:recordings-updated', handleUpdate);
    document.addEventListener('panda:sounds-change', (event) => {
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
