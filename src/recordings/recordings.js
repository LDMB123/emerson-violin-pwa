import { getJSON, setJSON, setBlob, removeBlob, supportsIndexedDB } from '../persistence/storage.js';
import { dataUrlToBlob, blobToDataUrl } from '../utils/recording-export.js';
import {
    getSongIdFromViewId,
    getSongIdFromHash,
    createBlobKey as createRecordingBlobKey,
    parseDuration,
} from '../utils/recording-export.js';
import { RECORDINGS_KEY } from '../persistence/storage-keys.js';
import { RECORDINGS_UPDATED } from '../utils/event-names.js';
const MAX_RECORDINGS = 4;
const recordToggle = document.querySelector('#setting-recordings');
const statusEl = document.querySelector('[data-recording-status]');

let recorder = null;
let recordingStream = null;
let recordingSongId = null;
let chunks = [];
let permissionListenerBound = false;
let stopPromise = null;
let stopResolve = null;

const getSongId = (section) => getSongIdFromViewId(section?.id);
const getCurrentSongId = () => getSongIdFromHash(window.location.hash);

const getSongTitle = (songId) => {
    const view = document.getElementById(`view-song-${songId}`);
    const title = view?.querySelector('h2')?.textContent?.trim();
    return title || songId || 'Practice Clip';
};

const scheduleIdle = (task) => {
    if (globalThis.scheduler?.postTask) {
        globalThis.scheduler.postTask(task, { priority: 'background' });
        return;
    }
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => task(), { timeout: 1200 });
        return;
    }
    window.setTimeout(task, 400);
};

const createBlobKey = (songId) => createRecordingBlobKey(songId);

const pruneBlobs = async (previous, next) => {
    if (!supportsIndexedDB) return;
    const keep = new Set(next.map((entry) => entry.blobKey).filter(Boolean));
    const removals = previous
        .map((entry) => entry.blobKey)
        .filter((key) => key && !keep.has(key));
    if (!removals.length) return;
    await Promise.allSettled(removals.map((key) => removeBlob(key)));
};

const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    return Array.isArray(stored) ? stored : [];
};

const migrateRecordingsToBlobs = async () => {
    if (!supportsIndexedDB) return;
    const recordings = await loadRecordings();
    const candidates = recordings.filter((recording) => recording?.dataUrl && !recording?.blobKey);
    if (!candidates.length) return;
    const next = [...recordings];
    let changed = false;

    for (let i = 0; i < recordings.length; i += 1) {
        const recording = recordings[i];
        if (!recording?.dataUrl || recording?.blobKey) continue;
        try {
            const blob = await dataUrlToBlob(recording.dataUrl);
            const blobKey = createBlobKey(recording.id || 'recording');
            const stored = await setBlob(blobKey, blob);
            if (!stored) continue;
            next[i] = {
                ...recording,
                dataUrl: null,
                blobKey,
                mimeType: blob.type || recording.mimeType || 'audio/webm',
            };
            changed = true;
        } catch {
            // Ignore individual migration failures
        }
    }

    if (changed) {
        await setJSON(RECORDINGS_KEY, next);
        window.dispatchEvent(new Event(RECORDINGS_UPDATED));
    }
};

const saveRecording = async (songId, duration, blob) => {
    const recordings = await loadRecordings();

    let blobKey = null;
    if (supportsIndexedDB && blob) {
        blobKey = createBlobKey(songId);
        const stored = await setBlob(blobKey, blob);
        if (!stored) blobKey = null;
    }
    const dataUrl = blobKey ? null : await blobToDataUrl(blob);
    const entry = {
        id: songId,
        title: getSongTitle(songId),
        duration: Math.round(duration || 0),
        createdAt: new Date().toISOString(),
        dataUrl,
        blobKey,
        mimeType: blob?.type || 'audio/webm',
    };
    const next = [entry, ...recordings].slice(0, MAX_RECORDINGS);
    await setJSON(RECORDINGS_KEY, next);
    await pruneBlobs(recordings, next);
    window.dispatchEvent(new Event(RECORDINGS_UPDATED));
};

const pickMimeType = () => {
    if (!('MediaRecorder' in window)) return '';
    const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const stopRecording = async () => {
    if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
    }
    if (stopPromise) {
        await Promise.race([
            stopPromise,
            new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
        stopPromise = null;
        stopResolve = null;
    }
    if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
    }
    recorder = null;
    recordingStream = null;
    recordingSongId = null;
    chunks = [];
    if (statusEl && recordToggle?.checked) {
        statusEl.textContent = 'Recording status: ready.';
    }
};

const startRecording = async (songId) => {
    if (!recordToggle?.checked) return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (recorder) await stopRecording();

    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
        if (recordToggle) recordToggle.checked = false;
        if (statusEl) statusEl.textContent = 'Recording status: microphone permission denied.';
        return;
    }

    const mimeType = pickMimeType();
    recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
    const recordingId = songId;
    const startedAt = performance.now();
    const actualMimeType = recorder.mimeType || mimeType || 'audio/webm';
    recordingSongId = recordingId;
    chunks = [];
    stopPromise = new Promise((resolve) => {
        stopResolve = resolve;
    });

    recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunks.push(event.data);
    });

    recorder.addEventListener('stop', async () => {
        try {
            if (!recordingId || !chunks.length) return;
            const blob = new Blob(chunks, { type: actualMimeType });
            const duration = (performance.now() - startedAt) / 1000;
            await saveRecording(recordingId, duration, blob);
        } finally {
            stopResolve?.();
        }
    });

    recorder.start();
    if (statusEl) statusEl.textContent = 'Recording status: recording in progress.';
};

const bindSongViews = () => {
    const songViews = Array.from(document.querySelectorAll('.song-view'));
    songViews.forEach((view) => {
        const toggle = view.querySelector('.song-play-toggle');
        const sheet = view.querySelector('.song-sheet');
        const playhead = view.querySelector('.song-playhead');
        const songId = getSongId(view);
        if (!toggle || !songId) return;
        const duration = parseDuration(sheet);

        toggle.addEventListener('change', () => {
            if (!recordToggle?.checked) return;
            if (toggle.checked) {
                startRecording(songId);
            } else {
                stopRecording();
            }
        });

        if (playhead) {
            playhead.addEventListener('animationend', () => {
                if (recordingSongId === songId) {
                    stopRecording();
                }
            });
        }

        if (duration && recordToggle) {
            view.dataset.songDuration = String(duration);
        }
    });
};

const initRecordings = () => {
    if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
        if (recordToggle) {
            recordToggle.checked = false;
            recordToggle.disabled = true;
        }
        if (statusEl) {
            statusEl.textContent = 'Recording status: unavailable on this device.';
        }
        return;
    }
    bindSongViews();
    if (statusEl) {
        statusEl.textContent = 'Recording status: ready.';
    }
    updatePermissionState();
    scheduleIdle(() => migrateRecordingsToBlobs());

    if (recordToggle) {
        recordToggle.addEventListener('change', () => {
            if (!recordToggle.checked) {
                stopRecording();
                if (statusEl) statusEl.textContent = 'Recording status: off.';
                return;
            }
            updatePermissionState(true);
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopRecording();
        }
    });
    window.addEventListener('pagehide', () => {
        stopRecording();
    });

    window.addEventListener('hashchange', () => {
        const currentSong = getCurrentSongId();
        if (!currentSong || (recordingSongId && currentSong !== recordingSongId)) {
            stopRecording();
        }
    }, { passive: true });
};

const updatePermissionState = async (announce = false) => {
    if (!statusEl) return;
    if (!navigator.permissions?.query) {
        if (announce && statusEl) {
            statusEl.textContent = 'Recording status: ready.';
        }
        return;
    }
    try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        const state = result.state;
        if (state === 'granted') {
            statusEl.textContent = 'Recording status: ready.';
        } else if (state === 'denied') {
            statusEl.textContent = 'Recording status: microphone blocked in settings.';
        } else if (announce) {
            statusEl.textContent = 'Recording status: allow microphone access to record.';
        }
        if (!permissionListenerBound) {
            permissionListenerBound = true;
            result.addEventListener('change', () => updatePermissionState());
        }
    } catch {
        if (announce) statusEl.textContent = 'Recording status: ready.';
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecordings);
} else {
    initRecordings();
}
