import { createGame } from './game-shell.js';
import {
    formatStars,
    cachedEl,
    readLiveNumber,
    setLiveNumber,
    markChecklist,
    bindTap,
    playToneNote,
    stopTonePlayer,
} from './shared.js';
import { clamp } from '../utils/math.js';
import { RT_STATE } from '../utils/event-names.js';

const pitchScoreEl = cachedEl('[data-pitch="score"]');
const pitchStarsEl = cachedEl('[data-pitch="stars"]');

const noteStepMap = {
    G: 'pq-step-1',
    D: 'pq-step-2',
    A: 'pq-step-3',
    E: 'pq-step-4',
};

const { bind } = createGame({
    id: 'pitch-quest',
    computeAccuracy: (state) => (state.attempts ? (state.hits / state.attempts) * 100 : 0),
    onReset: (gameState) => {
        gameState.score = 0;
        gameState.stars = 0;
        gameState.streak = 0;
        gameState.stabilityStreak = 0;
        gameState.attempts = 0;
        gameState.hits = 0;
        gameState.liveFeature = null;

        if (gameState._scoreEl) setLiveNumber(gameState._scoreEl, 'liveScore', 0);
        if (gameState._starsEl) {
            gameState._starsEl.dataset.liveStars = '0';
            gameState._starsEl.textContent = formatStars(0, 3);
        }
        if (gameState._stabilityEl) gameState._stabilityEl.textContent = '0x';
        if (gameState._feedbackEl) gameState._feedbackEl.textContent = 'Listening is off. Tap Start Listening.';
        if (gameState._offsetEl) gameState._offsetEl.textContent = '0 cents';
        if (gameState._noteEl) gameState._noteEl.textContent = '--';
        if (gameState._gauge) gameState._gauge.style.setProperty('--pitch-offset', '0deg');
    },
    onBind: (stage, difficulty, { reportSession, gameState }) => {
        const statusEl = stage.querySelector('[data-pitch="status"]');
        const checkButton = stage.querySelector('[data-pitch="check"]');
        const scoreEl = stage.querySelector('[data-pitch="score"]');
        const starsEl = stage.querySelector('[data-pitch="stars"]');
        const stabilityEl = stage.querySelector('[data-pitch="stability"]');
        const feedbackEl = stage.querySelector('[data-pitch="feedback"]');
        const noteEl = stage.querySelector('[data-pitch="live-note"]');
        const offsetEl = stage.querySelector('[data-pitch="offset"]');
        const gauge = stage.querySelector('.pitch-gauge');
        const targets = Array.from(stage.querySelectorAll('.pitch-target-toggle'));
        const checklist = Array.from(stage.querySelectorAll('input[id^="pq-step-"]'));

        const tolerance = Math.max(4, Math.round(7 * difficulty.speed));

        let score = readLiveNumber(scoreEl, 'liveScore') ?? 0;
        let stars = readLiveNumber(starsEl, 'liveStars') ?? 0;
        let streak = 0;
        let stabilityStreak = 0;
        let lastStableAt = 0;

        gameState.score = score;
        gameState.stars = stars;
        gameState.streak = streak;
        gameState.stabilityStreak = stabilityStreak;
        gameState.attempts = 0;
        gameState.hits = 0;
        gameState.liveFeature = null;
        gameState._scoreEl = scoreEl;
        gameState._starsEl = starsEl;
        gameState._stabilityEl = stabilityEl;
        gameState._feedbackEl = feedbackEl;
        gameState._offsetEl = offsetEl;
        gameState._noteEl = noteEl;
        gameState._gauge = gauge;

        gameState._onDeactivate = () => {
            stopTonePlayer();
            if (gameState._rtHandler) {
                document.removeEventListener(RT_STATE, gameState._rtHandler);
                gameState._rtHandler = null;
            }
        };

        const getTargetNote = () => {
            const active = targets.find((radio) => radio.checked);
            if (!active) return null;
            return active.id.split('-').pop()?.toUpperCase() || null;
        };

        const updateTargetStatus = () => {
            if (!statusEl) return;
            const note = getTargetNote();
            statusEl.textContent = note ? `Target: ${note} · ±${tolerance}¢` : 'Pick a target note.';
        };

        const updateLiveFeature = (feature) => {
            if (!feature) return;
            gameState.liveFeature = feature;
            const cents = clamp(Math.round(feature.cents || 0), -50, 50);
            if (offsetEl) offsetEl.textContent = `${cents > 0 ? '+' : ''}${cents} cents`;
            if (noteEl) noteEl.textContent = feature.note || '--';
            if (gauge) gauge.style.setProperty('--pitch-offset', `${cents * 0.5}deg`);

            const targetNote = getTargetNote();
            const inTune = Math.abs(cents) <= tolerance;
            const matchingNote = targetNote && (feature.note || '').startsWith(targetNote);

            if (inTune && matchingNote) {
                const now = Date.now();
                stabilityStreak = now - lastStableAt <= 1800 ? stabilityStreak + 1 : 1;
                lastStableAt = now;
                if (stabilityStreak >= 3) {
                    markChecklist('pq-step-5');
                }
            } else {
                stabilityStreak = 0;
            }
            if (stabilityEl) stabilityEl.textContent = `${stabilityStreak}x`;

            if (feedbackEl) {
                if (!feature.hasSignal) {
                    feedbackEl.textContent = 'Listening for your note...';
                } else if (inTune && matchingNote) {
                    feedbackEl.textContent = `Great lock on ${targetNote}.`;
                } else if (!matchingNote) {
                    feedbackEl.textContent = `Aim for ${targetNote || 'the target note'}.`;
                } else if (cents > 0) {
                    feedbackEl.textContent = 'A little lower.';
                } else {
                    feedbackEl.textContent = 'A little higher.';
                }
            }
        };

        const onRealtimeState = (event) => {
            if (window.location.hash !== '#view-game-pitch-quest') return;
            const feature = event.detail?.lastFeature;
            if (!feature || event.detail?.paused) return;
            updateLiveFeature(feature);
        };

        gameState._rtHandler = onRealtimeState;
        document.addEventListener(RT_STATE, onRealtimeState);

        targets.forEach((radio) => {
            radio.addEventListener('change', () => {
                streak = 0;
                stabilityStreak = 0;
                gameState.streak = 0;
                gameState.stabilityStreak = 0;
                if (stabilityEl) stabilityEl.textContent = '0x';
                updateTargetStatus();
                const targetNote = getTargetNote();
                if (targetNote) {
                    playToneNote(targetNote, { duration: 0.26, volume: 0.18, type: 'triangle' });
                }
            });
        });

        bindTap(checkButton, () => {
            const feature = gameState.liveFeature;
            const targetNote = getTargetNote();
            if (!targetNote) {
                if (feedbackEl) feedbackEl.textContent = 'Pick a target note first.';
                return;
            }
            if (!feature || !feature.hasSignal) {
                if (feedbackEl) feedbackEl.textContent = 'Tap Start Listening first.';
                return;
            }

            const cents = Number.isFinite(feature.cents) ? feature.cents : 0;
            const inTune = Math.abs(cents) <= tolerance;
            const matchedNote = (feature.note || '').startsWith(targetNote);
            const matched = inTune && matchedNote;

            gameState.attempts += 1;
            if (matched) {
                gameState.hits += 1;
                streak += 1;
                gameState.streak = streak;
                score += 20 + streak * 4;
                stars = Math.max(stars, Math.min(3, Math.ceil(streak / 2)));
                markChecklist(noteStepMap[targetNote]);
                if (streak >= 2) markChecklist('pq-step-6');
                playToneNote(targetNote, { duration: 0.3, volume: 0.2, type: 'triangle' });
            } else {
                streak = 0;
                gameState.streak = 0;
                score = Math.max(0, score - 8);
                playToneNote(cents > 0 ? 'F#' : 'F', { duration: 0.2, volume: 0.14, type: 'sawtooth' });
            }

            gameState.score = score;
            gameState.stars = stars;
            setLiveNumber(scoreEl, 'liveScore', score);
            if (starsEl) {
                starsEl.dataset.liveStars = String(stars);
                starsEl.textContent = formatStars(stars, 3);
            }

            if (checklist.length && checklist.every((input) => input.checked)) {
                reportSession();
            }
        });

        updateTargetStatus();
    },
});

const updatePitchQuest = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-pitch-quest input[id^="pq-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = pitchScoreEl();
    const starsEl = pitchStarsEl();
    if (scoreEl && !Number.isFinite(readLiveNumber(scoreEl, 'liveScore'))) {
        scoreEl.textContent = String(checked * 15 + (checked === inputs.length ? 10 : 0));
    }
    if (starsEl && !Number.isFinite(readLiveNumber(starsEl, 'liveStars'))) {
        starsEl.textContent = formatStars(Math.min(3, Math.ceil(checked / 2)), 3);
    }
};

export { updatePitchQuest as update, bind };

