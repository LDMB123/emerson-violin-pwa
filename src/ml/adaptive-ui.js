import { getAdaptiveSummary, resetAdaptiveModel, updateGameResult } from './adaptive-engine.js';
import { formatDifficulty } from '../tuner/tuner-utils.js';
import { ML_UPDATE, ML_RESET } from '../utils/event-names.js';

const statusEl = document.querySelector('[data-ml-status]');
const detailEl = document.querySelector('[data-ml-detail]');
const resetButton = document.querySelector('[data-ml-reset]');
const demoToggle = document.querySelector('[data-ml-demo]');
const simulateButton = document.querySelector('[data-ml-simulate]');

const formatTimestamp = (value) => {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return '—';
    }
};

const updateSummary = async () => {
    if (!statusEl && !detailEl) return;
    const summary = await getAdaptiveSummary();
    if (!summary.total) {
        if (statusEl) statusEl.textContent = 'Adaptive learning is ready. Play a game to personalize difficulty.';
        if (detailEl) detailEl.textContent = 'No adaptive sessions logged yet.';
        return;
    }
    const last = summary.last;
    if (statusEl) {
        statusEl.textContent = `Adaptive learning: ${summary.total} sessions logged.`;
    }
    if (detailEl) {
        const recent = last
            ? `${last.id || 'session'} · ${formatDifficulty(last.difficulty)} · ${formatTimestamp(last.timestamp)}`
            : '—';
        detailEl.textContent = `Most recent: ${recent}.`;
    }
};

const sampleIds = [
    'pitch-quest',
    'rhythm-dash',
    'note-memory',
    'ear-trainer',
    'bow-hero',
    'string-quest',
    'rhythm-painter',
    'story-song',
    'pizzicato',
    'tuning-time',
    'melody-maker',
    'scale-practice',
    'duet-challenge',
    'tuner',
    'coach-focus',
    'trainer-metronome',
    'trainer-posture',
    'bowing-coach',
];

const simulateAdaptiveSessions = async () => {
    if (simulateButton) simulateButton.disabled = true;
    const chooseAccuracy = () => {
        const roll = Math.random();
        if (roll < 0.33) return 35 + Math.random() * 10;
        if (roll < 0.66) return 60 + Math.random() * 10;
        return 85 + Math.random() * 10;
    };
    for (const id of sampleIds) {
        const accuracy = chooseAccuracy();
        const score = Math.round(accuracy);
        await updateGameResult(id, { accuracy, score });
        await updateGameResult(id, { accuracy, score });
    }
    await updateSummary();
    if (statusEl) statusEl.textContent = 'Demo data applied. Adaptive difficulty has shifted.';
    if (simulateButton) simulateButton.disabled = false;
};

if (resetButton) {
    resetButton.addEventListener('click', async () => {
        resetButton.disabled = true;
        await resetAdaptiveModel();
        await updateSummary();
        resetButton.disabled = false;
        if (statusEl) statusEl.textContent = 'Adaptive learning reset. New sessions will rebuild difficulty.';
    });
}

if (demoToggle && simulateButton) {
    simulateButton.disabled = !demoToggle.checked;
    demoToggle.addEventListener('change', () => {
        simulateButton.disabled = !demoToggle.checked;
        if (demoToggle.checked && statusEl) {
            statusEl.textContent = 'Demo mode on. Click simulate to preview adaptive shifts.';
        } else {
            updateSummary();
        }
    });

    simulateButton.addEventListener('click', () => {
        if (!demoToggle.checked) return;
        simulateAdaptiveSessions();
    });
}

updateSummary();

document.addEventListener(ML_UPDATE, () => {
    updateSummary();
});

document.addEventListener(ML_RESET, () => {
    updateSummary();
});
