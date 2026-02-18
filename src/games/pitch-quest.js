import { createGame } from './game-shell.js';
import {
    formatStars,
    cachedEl,
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    bindTap,
    playToneNote,
} from './shared.js';
import { clamp } from '../utils/math.js';

const pitchScoreEl = cachedEl('[data-pitch="score"]');
const pitchStarsEl = cachedEl('[data-pitch="stars"]');

const updatePitchQuest = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-pitch-quest input[id^="pq-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const total = inputs.length;
    const scoreEl = pitchScoreEl();
    const starsEl = pitchStarsEl();
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveStars = readLiveNumber(starsEl, 'liveStars');

    if (scoreEl) {
        const score = Number.isFinite(liveScore) ? liveScore : (checked * 15 + (checked === total ? 10 : 0));
        scoreEl.textContent = String(score);
    }

    if (starsEl) {
        const stars = Number.isFinite(liveStars) ? Math.round(liveStars) : Math.min(3, Math.ceil(checked / 2));
        starsEl.textContent = formatStars(stars, 3);
    }
};

const { bind } = createGame({
    id: 'pitch-quest',
    computeAccuracy: (state) => state.attempts
        ? (state.hits / state.attempts) * 100
        : 0,
    onReset: (gameState) => {
        gameState.score = 0;
        gameState.stars = 0;
        gameState.streak = 0;
        gameState.stabilityStreak = 0;
        gameState.attempts = 0;
        gameState.hits = 0;
        const scoreEl = gameState._scoreEl;
        const starsEl = gameState._starsEl;
        const stabilityEl = gameState._stabilityEl;
        if (scoreEl) setLiveNumber(scoreEl, 'liveScore', 0);
        if (starsEl) {
            starsEl.dataset.liveStars = '0';
            starsEl.textContent = formatStars(0, 3);
        }
        if (stabilityEl) stabilityEl.textContent = '0x';
        if (gameState._updateTargetStatus) gameState._updateTargetStatus();
        if (gameState._slider && gameState._setOffset) {
            gameState._setOffset(gameState._slider.value);
        }
    },
    onBind: (stage, difficulty, { reportSession, gameState }) => {
        const slider = stage.querySelector('[data-pitch="slider"]');
        const toleranceSlider = stage.querySelector('[data-pitch="tolerance"]');
        const toleranceValue = stage.querySelector('[data-pitch="tolerance-value"]');
        const offsetEl = stage.querySelector('[data-pitch="offset"]');
        const feedbackEl = stage.querySelector('[data-pitch="feedback"]');
        const statusEl = stage.querySelector('[data-pitch="status"]');
        const checkButton = stage.querySelector('[data-pitch="check"]');
        const gauge = stage.querySelector('.pitch-gauge');
        const scoreEl = stage.querySelector('[data-pitch="score"]');
        const starsEl = stage.querySelector('[data-pitch="stars"]');
        const stabilityEl = stage.querySelector('[data-pitch="stability"]');
        const targets = Array.from(stage.querySelectorAll('.pitch-target-toggle'));
        const checklist = Array.from(stage.querySelectorAll('input[id^="pq-step-"]'));

        let score = readLiveNumber(scoreEl, 'liveScore') ?? 0;
        let stars = readLiveNumber(starsEl, 'liveStars') ?? 0;
        let streak = 0;
        let stabilityStreak = 0;
        let lastMatchAt = 0;
        // difficulty.speed: scales initial tolerance window; speed=1.0 keeps tolerance=6
        // difficulty.complexity: visual feedback only for this game (no content pool to select)
        let tolerance = Math.round(6 * difficulty.speed);

        // Initialize state
        gameState.score = score;
        gameState.stars = stars;
        gameState.streak = streak;
        gameState.stabilityStreak = stabilityStreak;
        gameState.attempts = 0;
        gameState.hits = 0;
        gameState._scoreEl = scoreEl;
        gameState._starsEl = starsEl;
        gameState._stabilityEl = stabilityEl;
        gameState._slider = slider;

        const targetNoteFromInput = (input) => {
            const raw = input?.id?.split('-').pop();
            return raw ? raw.toUpperCase() : null;
        };

        const updateTargetStatus = () => {
            if (!statusEl) return;
            const active = targets.find((radio) => radio.checked);
            if (!active) {
                statusEl.textContent = 'Pick a target note.';
                return;
            }
            const note = active.id.split('-').pop()?.toUpperCase() || '';
            statusEl.textContent = note ? `Target: ${note} · ±${tolerance}¢` : 'Pick a target note.';
        };

        const setOffset = (raw) => {
            const cents = clamp(Number(raw) || 0, -50, 50);
            const angle = cents * 0.5;
            if (slider) {
                const sign = cents > 0 ? '+' : '';
                slider.setAttribute('aria-valuenow', String(cents));
                slider.setAttribute('aria-valuetext', `${sign}${cents} cents`);
            }
            if (gauge) gauge.style.setProperty('--pitch-offset', `${angle}deg`);
            if (offsetEl) {
                const sign = cents > 0 ? '+' : '';
                offsetEl.textContent = `${sign}${cents} cents`;
            }
            if (feedbackEl) {
                if (Math.abs(cents) <= tolerance) {
                    feedbackEl.textContent = `In tune (±${tolerance}¢) ✨`;
                } else if (cents > 0) {
                    feedbackEl.textContent = 'A little sharp — ease it down.';
                } else {
                    feedbackEl.textContent = 'A little flat — lift it up.';
                }
            }
            return cents;
        };

        const updateTolerance = (value, { user = false } = {}) => {
            const next = clamp(Number(value) || tolerance, 3, 12);
            tolerance = next;
            if (toleranceValue) toleranceValue.textContent = `±${next}¢`;
            if (toleranceSlider) {
                toleranceSlider.value = String(next);
                toleranceSlider.setAttribute('aria-valuenow', String(next));
                toleranceSlider.setAttribute('aria-valuetext', `±${next} cents`);
                if (user) toleranceSlider.dataset.userSet = 'true';
            }
            updateTargetStatus();
            if (slider) setOffset(slider.value);
        };

        const updateStability = (value) => {
            if (!stabilityEl) return;
            stabilityEl.textContent = `${value}x`;
        };

        const randomizeOffset = () => {
            if (!slider) return;
            const value = Math.round((Math.random() * 40) - 20);
            slider.value = String(value);
            setOffset(value);
        };

        const markNoteChecklist = () => {
            const next = checklist.find((input) => !input.checked && /pq-step-[1-4]/.test(input.id));
            if (!next) return;
            next.checked = true;
            next.dispatchEvent(new Event('change', { bubbles: true }));
        };

        // Store helpers for onReset
        gameState._updateTargetStatus = updateTargetStatus;
        gameState._setOffset = setOffset;

        slider?.addEventListener('input', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            setOffset(target.value);
        });

        targets.forEach((radio) => {
            radio.addEventListener('change', () => {
                streak = 0;
                stabilityStreak = 0;
                gameState.streak = 0;
                gameState.stabilityStreak = 0;
                randomizeOffset();
                updateTargetStatus();
                updateStability(stabilityStreak);
                const note = targetNoteFromInput(radio);
                if (note) {
                    playToneNote(note, { duration: 0.3, volume: 0.18, type: 'triangle' });
                }
            });
        });

        bindTap(checkButton, () => {
            const activeTarget = targets.find((radio) => radio.checked);
            if (!activeTarget) {
                if (statusEl) statusEl.textContent = 'Pick a target note before checking.';
                return;
            }
            const cents = slider ? setOffset(slider.value) : 0;
            const targetNote = targetNoteFromInput(activeTarget);
            const matched = Math.abs(cents) <= tolerance;
            gameState.attempts += 1;
            if (matched) {
                gameState.hits += 1;
                streak += 1;
                gameState.streak = streak;
                score += 18 + streak * 3;
                gameState.score = score;
                stars = Math.max(stars, Math.min(3, Math.ceil(streak / 2)));
                gameState.stars = stars;
                markNoteChecklist();
                if (targetNote) {
                    playToneNote(targetNote, { duration: 0.32, volume: 0.2, type: 'triangle' });
                }
                const now = Date.now();
                if (now - lastMatchAt <= 4000) {
                    stabilityStreak += 1;
                    gameState.stabilityStreak = stabilityStreak;
                } else {
                    stabilityStreak = 1;
                    gameState.stabilityStreak = 1;
                }
                lastMatchAt = now;
                if (stabilityStreak >= 3) markChecklist('pq-step-5');
                if (streak >= 2) markChecklist('pq-step-6');
            } else {
                streak = 0;
                stabilityStreak = 0;
                gameState.streak = 0;
                gameState.stabilityStreak = 0;
                score = Math.max(0, score - 6);
                gameState.score = score;
                const detuneNote = cents > 0 ? 'F#' : 'F';
                playToneNote(detuneNote, { duration: 0.2, volume: 0.14, type: 'sawtooth' });
            }
            setLiveNumber(scoreEl, 'liveScore', score);
            if (starsEl) {
                starsEl.dataset.liveStars = String(stars);
                starsEl.textContent = formatStars(stars, 3);
            }
            updateStability(stabilityStreak);
            if (checklist.length && checklist.every((input) => input.checked)) {
                reportSession();
            }
        });

        if (slider) setOffset(slider.value);
        if (toleranceSlider) {
            updateTolerance(toleranceSlider.value);
            toleranceSlider.addEventListener('input', (event) => {
                const target = event.target;
                if (!(target instanceof HTMLInputElement)) return;
                updateTolerance(target.value, { user: true });
            });
        }
        updateTargetStatus();
        updateStability(stabilityStreak);
    },
});

export { updatePitchQuest as update, bind };
