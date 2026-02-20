import { isRecordingEnabled } from '../utils/feature-flags.js';
import { getSongIdFromViewId, getSongIdFromHash, parseDuration } from '../utils/recording-export.js';
import { createRecordingCaptureController } from './recordings-capture.js';
import { migrateRecordingsToBlobs, saveRecording } from './recordings-storage.js';

const MAX_RECORDINGS = 4;
let recordToggle = null;
let statusEl = null;
let permissionListenerBound = false;
let globalListenersBound = false;

const getSongId = (section) => getSongIdFromViewId(section?.id);
const getCurrentSongId = () => getSongIdFromHash(window.location.hash);

const getSongTitle = (songId) => {
    const view = document.getElementById(`view-song-${songId}`);
    const title = view?.querySelector('h2')?.textContent?.trim();
    return title || songId || 'Practice Clip';
};

const scheduleIdle = (task) => window.setTimeout(task, 400);

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

const handlePermissionDenied = () => {
    resolveSettingsElements();
    if (!recordToggle) return;
    recordToggle.checked = false;
    recordToggle.dispatchEvent(new Event('change', { bubbles: true }));
};

const recordingController = createRecordingCaptureController({
    recordingToggleOn,
    setRecordingStatus,
    saveRecording: (songId, duration, blob) =>
        saveRecording({
            songId,
            duration,
            blob,
            getSongTitle,
            maxRecordings: MAX_RECORDINGS,
        }),
    getSongId,
    parseDuration,
    onPermissionDenied: handlePermissionDenied,
});

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

const initRecordings = () => {
    resolveSettingsElements();
    recordingController.bindSongViews();
    setRecordingStatus('Recording status: ready.');
    updatePermissionState();
    scheduleIdle(() => migrateRecordingsToBlobs());

    if (globalListenersBound) return;
    globalListenersBound = true;

    document.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.id !== 'setting-recordings') return;
        if (!target.checked) {
            recordingController.stopRecording();
            setRecordingStatus('Recording status: off.');
            return;
        }
        updatePermissionState(true);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            recordingController.stopRecording();
        }
    });
    window.addEventListener('pagehide', () => {
        recordingController.stopRecording();
    });

    window.addEventListener(
        'hashchange',
        () => {
            const currentSong = getCurrentSongId();
            const recordingSongId = recordingController.getRecordingSongId();
            if (!currentSong || (recordingSongId && currentSong !== recordingSongId)) {
                recordingController.stopRecording();
            }
        },
        { passive: true },
    );
};

export { initRecordings };
export const init = initRecordings;
