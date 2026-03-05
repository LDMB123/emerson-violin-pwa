import { EchoGameCanvasEngine } from './echo-canvas.js';
import { MISSION_UPDATED, RT_FEATURE } from '../utils/event-names.js';
import { postAudioMessage } from '../realtime/session-controller.js';

let engine = null;
let container = null;
let startBtn = null;
let curtain = null;
let startHandler = null;

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

const runTimedPlayheadLoop = ({ durationMs, onFrame, onComplete } = {}) => new Promise((resolve) => {
    let startTime = null;
    const loop = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        if (elapsed < durationMs) {
            onFrame?.(elapsed / durationMs, elapsed);
            requestAnimationFrame(loop);
            return;
        }
        onComplete?.();
        resolve();
    };
    requestAnimationFrame(loop);
});

const startGameSequence = async () => {
    if (curtain) curtain.style.display = 'none';
    if (!engine) return;

    engine.resetGame();
    engine.updateState({
        phase: 'teacher_playing',
        teacherBuffer: generateTeacherWaveform()
    });

    // 1. Teacher Plays
    // Note: The WASM synthesizer trigger will go here
    await runTimedPlayheadLoop({
        durationMs: 4000,
        onFrame: (playheadPosition) => {
            engine.updateState({ playheadPosition });
            engine.render();
        },
    });

    engine.updateState({ playheadPosition: 0, phase: 'student_playing' });
    engine.render();
    // 2. Student Plays
    await startStudentRecordingSequence();
};

const startStudentRecordingSequence = async () => {
    // 1. Tell WASM to clear its buffer and start recording
    postAudioMessage({ type: 'echo_record' });

    await runTimedPlayheadLoop({
        durationMs: 4000,
        onFrame: (playheadPosition) => {
            engine.updateState({ playheadPosition });

            // Note: Polling WASM for live envelope goes here

            engine.render();
        },
        onComplete: () => {
            engine.updateState({ playheadPosition: 0, phase: 'evaluating' });

            // 2. Tell WASM we are done. Mute recording and ask for the envelope.
            postAudioMessage({ type: 'echo_extract' });

            // Note: Run WASM cross-correlation grading here
            engine.updateState({ evaluationScore: 85.5 });
            engine.render();
        },
    });

    await new Promise((resolve) => {
        setTimeout(resolve, 2000);
    });
};

export const init = () => {
    resolveElements();
    if (!container) return;

    dispose();

    document.addEventListener(MISSION_UPDATED, handleMissionUpdate);
    document.addEventListener(RT_FEATURE, handleRealtimeFeature);
    const canvas = container.querySelector('#echo-canvas');
    if (canvas) {
        engine = new EchoGameCanvasEngine(canvas);
        engine.handleResize();
    }

    if (startBtn) {
        startHandler = async () => {
            startBtn.disabled = true;
            startBtn.textContent = 'Get Ready...';
            // Trigger audio context warmup inside this human click handler
            setTimeout(() => {
                startGameSequence().then(() => {
                    if (curtain) {
                        curtain.style.display = 'flex';
                        startBtn.textContent = 'Play Again';
                        startBtn.disabled = false;
                    }
                });
            }, 500);
        };
        startBtn.addEventListener('click', startHandler);
    }
};

export const dispose = () => {
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
