import { EchoGameCanvasEngine } from './echo-canvas.js';
import { MISSION_UPDATED, RT_FEATURE } from '../utils/event-names.js';
import { postAudioMessage } from '../realtime/session-controller.js';

let engine = null;
let container = null;
let startBtn = null;
let curtain = null;

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
    // In Phase 5, this will be generated directly from the WASM synth buffer
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

const startGameSequence = async () => {
    if (curtain) curtain.style.display = 'none';
    if (!engine) return;

    engine.resetGame();
    engine.updateState({
        phase: 'teacher_playing',
        teacherBuffer: generateTeacherWaveform()
    });

    // 1. Teacher Plays
    const targetDuration = 4000;
    let startTime = null;

    // Note: The WASM synthesizer trigger will go here

    return new Promise(resolve => {
        const loop = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            if (elapsed < targetDuration) {
                engine.updateState({ playheadPosition: elapsed / targetDuration });
                engine.render();
                requestAnimationFrame(loop);
            } else {
                engine.updateState({ playheadPosition: 0, phase: 'student_playing' });
                engine.render();
                // 2. Student Plays
                startStudentRecordingSequence().then(resolve);
            }
        };
        requestAnimationFrame(loop);
    });
};

const startStudentRecordingSequence = async () => {
    // 1. Tell WASM to clear its buffer and start recording
    postAudioMessage({ type: 'echo_record' });

    const targetDuration = 4000;
    let startTime = null;

    return new Promise(resolve => {
        const loop = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            if (elapsed < targetDuration) {
                engine.updateState({ playheadPosition: elapsed / targetDuration });

                // Note: Polling WASM for live envelope goes here

                engine.render();
                requestAnimationFrame(loop);
            } else {
                engine.updateState({ playheadPosition: 0, phase: 'evaluating' });

                // 2. Tell WASM we are done. Mute recording and ask for the envelope.
                postAudioMessage({ type: 'echo_extract' });

                // Note: Run WASM cross-correlation grading here
                engine.updateState({ evaluationScore: 85.5 });
                engine.render();

                setTimeout(() => {
                    resolve();
                }, 2000);
            }
        };
        requestAnimationFrame(loop);
    });
};

export const init = () => {
    resolveElements();
    if (!container) return;

    document.addEventListener(MISSION_UPDATED, handleMissionUpdate);
    document.addEventListener(RT_FEATURE, handleRealtimeFeature);
    const canvas = container.querySelector('#echo-canvas');
    if (canvas) {
        engine = new EchoGameCanvasEngine(canvas);
        engine.handleResize();
    }

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
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
        });
    }
};

export const dispose = () => {
    document.removeEventListener(MISSION_UPDATED, handleMissionUpdate);
    document.removeEventListener(RT_FEATURE, handleRealtimeFeature);
    if (engine) {
        engine.destroy();
        engine = null;
    }
};
