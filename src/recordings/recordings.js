import { whenReady } from '../utils/dom-ready.js';
import { setJSON, setBlob, removeBlob } from '../persistence/storage.js';
import { loadRecordings } from '../persistence/loaders.js';
import { dataUrlToBlob, blobToDataUrl } from '../utils/recording-export.js';
import { isRecordingEnabled } from '../utils/feature-flags.js';
import {
    getSongIdFromViewId,
    getSongIdFromHash,
    createBlobKey as createRecordingBlobKey,
    parseDuration,
} from '../utils/recording-export.js';
import { RECORDINGS_KEY } from '../persistence/storage-keys.js';
import { RECORDINGS_UPDATED } from '../utils/event-names.js';
const MAX_RECORDINGS = 4;
let recordToggle = null;
let statusEl = null;

let recorder = null;
let recordingStream = null;
let recordingSongId = null;
let chunks = [];
let permissionListenerBound = false;
let stopPromise = null;
let stopResolve = null;
let globalListenersBound = false;

const getSongId = (section) => getSongIdFromViewId(section?.id);
const getCurrentSongId = () => getSongIdFromHash(window.location.hash);

const getSongTitle = (songId) => {
    const view = document.getElementById(`view-song-${songId}`);
    const title = view?.querySelector('h2')?.textContent?.trim();
    return title || songId || 'Practice Clip';
};

const scheduleIdle = (task) => window.setTimeout(task, 400);

const createBlobKey = (songId) => createRecordingBlobKey(songId);

const resolveSettingsElements = () => {
    recordToggle = document.querySelector('#setting-recordings');
    statusEl = document.querySelector('[data-recording-status]');
};

const setRecordingStatus = (message) => {
    resolveSettingsElements();
    if (statusEl) statusEl.textContent = message;
};

const recordingToggleOn = () => {
    resolveSettingsElements();
    if (recordToggle && typeof recordToggle.checked === 'boolean') {
        return recordToggle.checked;
    }
    return isRecordingEnabled();
};

const pruneBlobs = async (previous, next) => {
    const keep = new Set(next.map((entry) => entry.blobKey).filter(Boolean));
    const removals = previous
        .map((entry) => entry.blobKey)
        .filter((key) => key && !keep.has(key));
    if (!removals.length) return;
    await Promise.allSettled(removals.map((key) => removeBlob(key)));
};

const migrateRecordingsToBlobs = async () => {
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
    if (blob) {
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
    if (typeof MediaRecorder === 'undefined') return '';
    if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
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
    if (recordingToggleOn()) {
        setRecordingStatus('Recording status: ready.');
    }
};

const startRecording = async (songId) => {
    if (!recordingToggleOn()) return;
    if (recorder) await stopRecording();

    if (!navigator.mediaDevices?.getUserMedia) {
        setRecordingStatus('Recording status: microphone capture unavailable on this device.');
        return;
    }

    if (typeof MediaRecorder === 'undefined') {
        setRecordingStatus('Recording status: recording unsupported on this browser.');
        return;
    }

    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
        resolveSettingsElements();
        if (recordToggle) {
            recordToggle.checked = false;
            recordToggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setRecordingStatus('Recording status: microphone permission denied.');
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
    setRecordingStatus('Recording status: recording in progress.');
};

const bindSongViews = () => {
    const songViews = Array.from(document.querySelectorAll('.song-view'));
    songViews.forEach((view) => {
        if (view.dataset.recordingsBound === 'true') return;
        view.dataset.recordingsBound = 'true';
        const toggle = view.querySelector('.song-play-toggle');
        const sheet = view.querySelector('.song-sheet');
        const playhead = view.querySelector('.song-playhead');
        const songId = getSongId(view);
        if (!toggle || !songId) return;
        const duration = parseDuration(sheet);

        toggle.addEventListener('change', () => {
            if (!recordingToggleOn()) return;
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

        if (duration) {
            view.dataset.songDuration = String(duration);
        }
    });
};

const initRecordings = () => {
    resolveSettingsElements();
    bindSongViews();
    setRecordingStatus('Recording status: ready.');
    updatePermissionState();
    scheduleIdle(() => migrateRecordingsToBlobs());

    if (globalListenersBound) return;
    globalListenersBound = true;

    document.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.id !== 'setting-recordings') return;
        if (!target.checked) {
            stopRecording();
            setRecordingStatus('Recording status: off.');
            return;
        }
        updatePermissionState(true);
    });

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
    resolveSettingsElements();
    if (!statusEl) return;
    if (!navigator.permissions?.query) {
        if (announce) setRecordingStatus('Recording status: ready.');
        return;
    }
    try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        const state = result.state;
        if (state === 'granted') {
            setRecordingStatus('Recording status: ready.');
        } else if (state === 'denied') {
            setRecordingStatus('Recording status: microphone blocked in settings.');
        } else if (announce) {
            setRecordingStatus('Recording status: allow microphone access to record.');
        }
        if (!permissionListenerBound) {
            permissionListenerBound = true;
            result.addEventListener('change', () => updatePermissionState());
        }
    } catch {
        if (announce) setRecordingStatus('Recording status: ready.');
    }
};

export { initRecordings };
export const init = initRecordings;

whenReady(initRecordings);
