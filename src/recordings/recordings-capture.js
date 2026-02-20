export const createRecordingCaptureController = ({
    recordingToggleOn,
    setRecordingStatus,
    saveRecording,
    getSongId,
    parseDuration,
    onPermissionDenied,
}) => {
    let recorder = null;
    let recordingStream = null;
    let recordingSongId = null;
    let chunks = [];
    let stopPromise = null;
    let stopResolve = null;

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
            onPermissionDenied?.();
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

    return {
        startRecording,
        stopRecording,
        bindSongViews,
        getRecordingSongId: () => recordingSongId,
    };
};
