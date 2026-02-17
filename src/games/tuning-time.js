import {
    readLiveNumber,
    markChecklist,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
} from './shared.js';
import { clamp } from '../utils/math.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';

const updateTuningTime = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-tuning-time input[id^="tt-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-tuning="score"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 25);
};

const bindTuningTime = () => {
    const stage = document.querySelector('#view-game-tuning-time');
    if (!stage) return;
    const statusEl = stage.querySelector('[data-tuning="status"]');
    const progressEl = stage.querySelector('[data-tuning="progress"]');
    const progressBar = progressEl?.parentElement;
    const buttons = Array.from(stage.querySelectorAll('.tuning-btn'));
    const audioMap = {
        G: stage.querySelector('audio[aria-labelledby="tuning-g-label"]'),
        D: stage.querySelector('audio[aria-labelledby="tuning-d-label"]'),
        A: stage.querySelector('audio[aria-labelledby="tuning-a-label"]'),
        E: stage.querySelector('audio[aria-labelledby="tuning-e-label"]'),
    };
    const checklistMap = {
        G: 'tt-step-1',
        D: 'tt-step-2',
        A: 'tt-step-3',
        E: 'tt-step-4',
    };
    const tunedNotes = new Set();
    let targetStrings = 3;
    let reported = false;

    const reportResult = attachTuning('tuning-time', (tuning) => {
        targetStrings = tuning.targetStrings ?? targetStrings;
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (statusEl && tunedNotes.size === 0) {
            statusEl.textContent = `Tune ${targetStrings} strings to warm up.`;
        }
        if (progressEl) {
            const percent = clamp((tunedNotes.size / targetStrings) * 100, 0, 100);
            progressEl.style.width = `${percent}%`;
            if (progressBar) progressBar.setAttribute('aria-valuenow', Math.round(percent));
        }
    });

    const reportSession = () => {
        if (reported || tunedNotes.size === 0) return;
        reported = true;
        const accuracy = clamp((tunedNotes.size / targetStrings) * 100, 0, 100);
        const score = tunedNotes.size * 25;
        reportResult({ accuracy, score });
        recordGameEvent('tuning-time', { accuracy, score });
    };

    buttons.forEach((button) => {
        bindTap(button, () => {
            const note = button.dataset.tuningNote;
            if (!note) return;
            if (!isSoundEnabled()) {
                if (statusEl) statusEl.textContent = 'Sounds are off. Enable Sounds to hear the tone.';
                return;
            }
            const audio = audioMap[note];
            if (audio) {
                if (!isSoundEnabled()) {
                    if (statusEl) statusEl.textContent = 'Sounds are off. Enable Sounds to hear the tone.';
                    return;
                }
                audio.currentTime = 0;
                if (!isSoundEnabled()) {
                    if (statusEl) statusEl.textContent = 'Sounds are off. Enable Sounds to hear the tone.';
                    return;
                }
                audio.play().catch(() => {});
            }
            tunedNotes.add(note);
            if (statusEl) {
                const remaining = Math.max(0, targetStrings - tunedNotes.size);
                statusEl.textContent = remaining
                    ? `Tuning ${note} · ${remaining} more string${remaining === 1 ? '' : 's'} to go.`
                    : 'All target strings tuned. Great job!';
            }
            if (progressEl) {
                const percent = clamp((tunedNotes.size / targetStrings) * 100, 0, 100);
                progressEl.style.width = `${percent}%`;
                if (progressBar) progressBar.setAttribute('aria-valuenow', Math.round(percent));
            }
            markChecklist(checklistMap[note]);
            if (tunedNotes.size >= targetStrings) {
                reportSession();
            }
        });
    });

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        if (event.detail?.enabled === false && statusEl) {
            statusEl.textContent = 'Sounds are off. Enable Sounds to hear tones.';
        }
    });

    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-game-tuning-time') {
            tunedNotes.clear();
            reported = false;
            if (statusEl) {
                statusEl.textContent = `Tune ${targetStrings} strings to warm up.`;
            }
            if (progressEl) {
                progressEl.style.width = '0%';
                if (progressBar) progressBar.setAttribute('aria-valuenow', 0);
            }
            return;
        }
        reportSession();
    }, { passive: true });
};

export { updateTuningTime as update, bindTuningTime as bind };
