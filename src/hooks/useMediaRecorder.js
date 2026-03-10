import { useState, useRef, useCallback, useEffect } from 'react';
import { saveRecording } from '../recordings/recordings-storage.js';

const pickMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
    const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

const stopStreamTracks = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
};

export function useMediaRecorder({ songId, getSongTitle, maxRecordings = 4, onFinish }) {
    const [isRecording, setIsRecording] = useState(false);
    const [durationSecs, setDurationSecs] = useState(0);
    const [error, setError] = useState(null);

    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const stopPromiseRef = useRef(null);
    const stopResolveRef = useRef(null);

    const resetRecorderState = useCallback(() => {
        recorderRef.current = null;
        streamRef.current = null;
        stopPromiseRef.current = null;
        stopResolveRef.current = null;
        chunksRef.current = [];
    }, []);

    const startRecording = useCallback(async () => {
        if (isRecording) return true;
        try {
            setError(null);

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Microphone capture unavailable on this device.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = pickMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;
            chunksRef.current = [];

            stopPromiseRef.current = new Promise((resolve) => {
                stopResolveRef.current = resolve;
            });

            recorder.addEventListener('dataavailable', (event) => {
                if (event.data?.size) chunksRef.current.push(event.data);
            });

            const actualMimeType = recorder.mimeType || mimeType || 'audio/webm';

            recorder.addEventListener('stop', async () => {
                try {
                    const blob = new Blob(chunksRef.current, { type: actualMimeType });
                    const elapsed = (performance.now() - startTimeRef.current) / 1000;

                    if (songId && chunksRef.current.length > 0) {
                        try {
                            await saveRecording({
                                songId,
                                duration: elapsed,
                                blob,
                                getSongTitle,
                                maxRecordings,
                            });
                        } catch (e) {
                            console.error('Failed to save recording to DB', e);
                        }
                    }

                    if (onFinish) {
                        onFinish({ blob, duration: elapsed });
                    }
                } finally {
                    if (stopResolveRef.current) stopResolveRef.current();
                }
            });

            recorder.start();
            setIsRecording(true);
            startTimeRef.current = performance.now();
            setDurationSecs(0);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDurationSecs(Math.floor((performance.now() - startTimeRef.current) / 1000));
            }, 1000);
            return true;

        } catch (err) {
            stopStreamTracks(streamRef.current);
            resetRecorderState();
            setIsRecording(false);
            console.error('Failed to start recording', err);
            setError(err);
            return false;
        }
    }, [getSongTitle, isRecording, maxRecordings, onFinish, resetRecorderState, songId]);

    const stopRecording = useCallback(async () => {
        if (!isRecording || !recorderRef.current) return false;
        try {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsRecording(false);

            if (recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
            }

            if (stopPromiseRef.current) {
                await Promise.race([
                    stopPromiseRef.current,
                    new Promise((resolve) => setTimeout(resolve, 800)),
                ]);
            }

            stopStreamTracks(streamRef.current);
            resetRecorderState();
            return true;
        } catch (err) {
            console.error('Failed to stop recording', err);
            setError(err);
            return false;
        }
    }, [isRecording, resetRecorderState]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
            }
            stopStreamTracks(streamRef.current);
            resetRecorderState();
        };
    }, [resetRecorderState]);

    return {
        isRecording,
        durationSecs,
        error,
        startRecording,
        stopRecording
    };
}
