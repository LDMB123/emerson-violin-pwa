import { EchoGameCanvasEngine } from './echo-canvas.js';
import { MISSION_UPDATED, RT_FEATURE } from '../utils/event-names.js';
import { postAudioMessage } from '../realtime/session-controller.js';

let engine = null;
let container = null;
let startBtn = null;
let curtain = null;
let startHandler = null;
let activeRunId = 0;
let pendingStartTimeoutId = null;
let pendingResultTimeoutId = null;
let activePlayheadRafId = null;

// Mock "Teacher" Rhythm Pattern (later this will come from ML/Curriculum)
const MOCK_TEACHER_PATTERN = [
    { start: 0, duration: 500, type: 'note' },
    { start: 500, duration: 500, type: 'note' },
    { start: 1000, duration: 1000, type: 'note' },
    { start: 2000, duration: 2000, type: 'rest' }
]; // "Pepperoni Pizza" or similar

const resolveElements = () => {
    container = document.getElementById('view-game-echo');
    if (!container) return;

    startBtn = container.querySelector('[data-echo="start"]');
    curtain = container.querySelector('[data-echo="curtain"]');
};

const handleMissionUpdate = () => {
    // reserved for mission-aware game logic
};

const invalidateActiveRun = () => {
    activeRunId += 1;
    return activeRunId;
};

const createRunId = () => invalidateActiveRun();

const isActiveRun = (runId) => Boolean(engine) && runId === activeRunId;

const clearTrackedTimeout = (timeoutId) => {
    if (timeoutId === null) return null;
    clearTimeout(timeoutId);
    return null;
};

const clearPendingAsyncWork = () => {
    pendingStartTimeoutId = clearTrackedTimeout(pendingStartTimeoutId);
    pendingResultTimeoutId = clearTrackedTimeout(pendingResultTimeoutId);
    if (activePlayheadRafId !== null) {
        cancelAnimationFrame(activePlayheadRafId);
        activePlayheadRafId = null;
    }
};

const restoreStartUi = () => {
    if (curtain) {
        curtain.style.display = 'flex';
    }
    if (startBtn) {
        startBtn.textContent = 'Play Again';
        startBtn.disabled = false;
    }
};

const handleRealtimeFeature = (e) => {
    const data = e.detail;
    if (data && data.type === 'echo_envelope') {
        const envelope = data.payload || [];
        if (engine) {
            engine.updateState({ studentBuffer: envelope });
        }
    }
};

const generateTeacherWaveform = () => {
    // Generate a visual representation of the audio the teacher is playing.
    // TODO: generate directly from the WASM synth buffer
    const buffer = new Float32Array(400); // 400 slices

    // Fill buffer based on mock pattern
    MOCK_TEACHER_PATTERN.forEach(note => {
        if (note.type !== 'note') return;

        // Map ms to slice index (0 - 4000ms = 0 - 400)
        const startIndex = Math.floor((note.start / 4000) * 400);
        const endIndex = Math.floor(((note.start + note.duration) / 4000) * 400);

        for (let i = startIndex; i < endIndex; i++) {
            // Simulate an ADSR envelope visually
            const progress = (i - startIndex) / (endIndex - startIndex);
            let amplitude = 0.8;
            if (progress < 0.1) amplitude = progress * 8; // Attack
            if (progress > 0.8) amplitude = (1 - progress) * 4; // Release
            buffer[i] = amplitude;
        }
    });

    return buffer;
};

const waitForTrackedDelay = ({ delayMs, runId, timerKey } = {}) => new Promise((resolve) => {
    if (!isActiveRun(runId)) {
        resolve(false);
        return;
    }

    const assignTimer = (value) => {
        if (timerKey === 'start') {
            pendingStartTimeoutId = value;
            return;
        }
        pendingResultTimeoutId = value;
    };

    const timeoutId = setTimeout(() => {
        assignTimer(null);
        resolve(isActiveRun(runId));
    }, delayMs);
    assignTimer(timeoutId);
});

const runTimedPlayheadLoop = ({ durationMs, onFrame, onComplete, runId } = {}) => new Promise((resolve, reject) => {
    if (!isActiveRun(runId)) {
        resolve(false);
        return;
    }

    let startTime = null;
    const loop = (timestamp) => {
        if (!isActiveRun(runId)) {
            activePlayheadRafId = null;
            resolve(false);
            return;
        }

        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        try {
            if (elapsed < durationMs) {
                onFrame?.(elapsed / durationMs, elapsed);
                activePlayheadRafId = requestAnimationFrame(loop);
                return;
            }
            activePlayheadRafId = null; // Clear *before* executing the callback 
            onComplete?.();
            resolve(true);
        } catch (error) {
            activePlayheadRafId = null;
            reject(error);
        }
    };
    activePlayheadRafId = requestAnimationFrame(loop);
});

const runEchoPlayheadLoop = ({ onFrame = null, onComplete = null, runId } = {}) => {
    if (!isActiveRun(runId)) return Promise.resolve(false);
    return runTimedPlayheadLoop({
        durationMs: 4000,
        runId,
        onFrame: (playheadPosition) => {
            if (!isActiveRun(runId)) return;
            engine.updateState({ playheadPosition });
            if (typeof onFrame === 'function') {
                onFrame(playheadPosition);
            }
        },
        onComplete,
    });
};

const startGameSequence = async (runId) => {
    if (!isActiveRun(runId)) return false;
    if (curtain) curtain.style.display = 'none';

    engine.resetGame();
    engine.updateState({
        phase: 'teacher_playing',
        teacherBuffer: generateTeacherWaveform()
    });

    // 1. Teacher Plays
    // Note: The WASM synthesizer trigger will go here
    const didCompleteTeacherTurn = await runEchoPlayheadLoop({ runId });
    if (!didCompleteTeacherTurn || !isActiveRun(runId)) return false;

    engine.updateState({ playheadPosition: 0, phase: 'student_playing' });
    // 2. Student Plays
    return startStudentRecordingSequence(runId);
};

const startStudentRecordingSequence = async (runId) => {
    if (!isActiveRun(runId)) return false;

    // 1. Tell WASM to clear its buffer and start recording
    postAudioMessage({ type: 'echo_record' });

    const didCompleteStudentTurn = await runEchoPlayheadLoop({
        runId,
        onFrame: () => {
            // Note: Polling WASM for live envelope goes here
        },
        onComplete: () => {
            if (!isActiveRun(runId)) return;
            engine.updateState({ playheadPosition: 0, phase: 'evaluating' });

            // 2. Tell WASM we are done. Mute recording and ask for the envelope.
            postAudioMessage({ type: 'echo_extract' });

            // Note: Run WASM cross-correlation grading here
            engine.updateState({ evaluationScore: 85.5 });
        },
    });
    if (!didCompleteStudentTurn || !isActiveRun(runId)) return false;

    return waitForTrackedDelay({ delayMs: 2000, runId, timerKey: 'result' });
};

const initEcho = () => {
    resolveElements();
    if (!container) return;

    dispose();

    document.addEventListener(MISSION_UPDATED, handleMissionUpdate);
    document.addEventListener(RT_FEATURE, handleRealtimeFeature);
    const canvas = container.querySelector('#echo-canvas');
    if (canvas) {
        engine = new EchoGameCanvasEngine(canvas);
    }

    if (startBtn) {
        startHandler = () => {
            const runId = createRunId();
            startBtn.disabled = true;
            startBtn.textContent = 'Get Ready...';
            // Trigger audio context warmup inside this human click handler
            void waitForTrackedDelay({ delayMs: 500, runId, timerKey: 'start' })
                .then((shouldContinue) => {
                    if (!shouldContinue) return false;
                    return startGameSequence(runId);
                })
                .catch((error) => {
                    if (isActiveRun(runId)) {
                        console.error('[Echo] failed to start sequence', error);
                    }
                    return false;
                })
                .finally(() => {
                    if (!isActiveRun(runId)) return;
                    restoreStartUi();
                });
        };
        startBtn.addEventListener('click', startHandler);
    }
};

/** Initializes the Echo game view, canvas engine, and realtime listeners. */
export const init = initEcho;

/** Tears down Echo game listeners, handlers, and canvas engine state. */
export const dispose = () => {
    invalidateActiveRun();
    clearPendingAsyncWork();
    document.removeEventListener(MISSION_UPDATED, handleMissionUpdate);
    document.removeEventListener(RT_FEATURE, handleRealtimeFeature);
    if (startBtn && startHandler) {
        startBtn.removeEventListener('click', startHandler);
        startHandler = null;
    }
    if (engine) {
        engine.destroy();
        engine = null;
    }
};
