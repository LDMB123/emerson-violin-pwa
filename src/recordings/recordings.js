import { getJSON, setJSON } from '../persistence/storage.js';

const RECORDINGS_KEY = 'panda-violin:recordings:v1';
const recordToggle = document.querySelector('#setting-recordings');

let recorder = null;
let recordingStream = null;
let recordingSongId = null;
let recordingStart = 0;
let chunks = [];

const getSongId = (section) => section?.id?.replace('view-song-', '') || '';
const getSongIdFromHash = () => {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#view-song-')) return '';
    return hash.replace('#view-song-', '');
};

const getSongTitle = (songId) => {
    const view = document.getElementById(`view-song-${songId}`);
    const title = view?.querySelector('h2')?.textContent?.trim();
    return title || songId || 'Practice Clip';
};

const parseDuration = (sheet) => {
    if (!sheet) return 0;
    const raw = sheet.style.getPropertyValue('--song-duration') || getComputedStyle(sheet).getPropertyValue('--song-duration');
    const value = Number.parseFloat(raw);
    return Number.isNaN(value) ? 0 : value;
};

const blobToDataUrl = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
});

const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    return Array.isArray(stored) ? stored : [];
};

const saveRecording = async (songId, duration, blob) => {
    const dataUrl = await blobToDataUrl(blob);
    const recordings = await loadRecordings();
    const entry = {
        id: songId,
        title: getSongTitle(songId),
        duration: Math.round(duration || 0),
        createdAt: new Date().toISOString(),
        dataUrl,
    };
    const next = [entry, ...recordings].slice(0, 2);
    await setJSON(RECORDINGS_KEY, next);
    window.dispatchEvent(new Event('panda:recordings-updated'));
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
    if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop());
    }
    recorder = null;
    recordingStream = null;
    recordingSongId = null;
    recordingStart = 0;
    chunks = [];
};

const startRecording = async (songId) => {
    if (!recordToggle?.checked) return;
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (recorder) await stopRecording();

    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
        if (recordToggle) recordToggle.checked = false;
        return;
    }

    const mimeType = pickMimeType();
    recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
    recordingSongId = songId;
    recordingStart = performance.now();
    chunks = [];

    recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunks.push(event.data);
    });

    recorder.addEventListener('stop', async () => {
        if (!recordingSongId || !chunks.length) return;
        const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
        const duration = (performance.now() - recordingStart) / 1000;
        await saveRecording(recordingSongId, duration, blob);
    });

    recorder.start();
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
        return;
    }
    bindSongViews();

if (recordToggle) {
    recordToggle.addEventListener('change', () => {
        if (!recordToggle.checked) {
            stopRecording();
        }
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
        const currentSong = getSongIdFromHash();
        if (!currentSong || (recordingSongId && currentSong !== recordingSongId)) {
            stopRecording();
        }
    }, { passive: true });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecordings);
} else {
    initRecordings();
}
