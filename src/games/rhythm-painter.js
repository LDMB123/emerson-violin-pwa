import { createGame } from './game-shell.js';
import {
    cachedEl,
    readLiveNumber,
    setLiveNumber,
    markChecklistIf,
    bindTap,
    playToneNote,
    playToneSequence,
    stopTonePlayer,
} from './shared.js';
import { clamp } from '../utils/math.js';

const painterScoreEl = cachedEl('[data-painter="score"]');
const painterCreativityEl = cachedEl('[data-painter="creativity"]');

const updateRhythmPainter = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-rhythm-painter input[id^="rp-pattern-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = painterScoreEl();
    const creativityEl = painterCreativityEl();
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCreativity = readLiveNumber(creativityEl, 'liveCreativity');
    const creativity = Math.min(100, checked * 25);

    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 120);
    if (creativityEl) {
        const value = Number.isFinite(liveCreativity) ? liveCreativity : creativity;
        creativityEl.textContent = `${value}%`;
    }
};

const refreshDisplay = (stage, gameState) => {
    const scoreEl = stage.querySelector('[data-painter="score"]');
    const creativityEl = stage.querySelector('[data-painter="creativity"]');
    const roundsEl = stage.querySelector('[data-painter="rounds"]');
    const meter = stage.querySelector('.painter-meter');
    const statusEl = stage.querySelector('[data-painter="status"]');
    const { score = 0, creativity = 0, rounds = 0, creativityTarget = 70 } = gameState;
    setLiveNumber(scoreEl, 'liveScore', score);
    setLiveNumber(creativityEl, 'liveCreativity', creativity, (value) => `${value}%`);
    if (roundsEl) roundsEl.textContent = String(rounds);
    const angle = (creativity / 100) * 180 - 90;
    if (meter) {
        meter.style.setProperty('--painter-angle', `${angle}deg`);
        meter.setAttribute('aria-valuenow', String(Math.round(creativity)));
        meter.setAttribute('aria-valuetext', `${creativity}% creativity`);
    }
    if (statusEl) {
        if (creativity >= creativityTarget) {
            statusEl.textContent = 'Fantastic rhythm flow!';
        } else if (creativity >= 50) {
            statusEl.textContent = 'Nice groove — keep layering.';
        } else {
            statusEl.textContent = 'Tap each dot to paint the beat.';
        }
    }
};

const { bind } = createGame({
    id: 'rhythm-painter',
    computeAccuracy: (state) => state.creativityTarget
        ? clamp((state.creativity / state.creativityTarget) * 100, 0, 100)
        : 0,
    computeUpdate: refreshDisplay,
    onReset: (gameState) => {
        gameState.score = 0;
        gameState.creativity = 0;
        gameState.tapCount = 0;
        gameState.rounds = 0;
        gameState.flourishPlayed = false;
        if (gameState._tappedDots) gameState._tappedDots.clear();
        if (gameState._dots) {
            gameState._dots.forEach((dot) => dot.classList.remove('is-hit'));
        }
        if (gameState._stage) refreshDisplay(gameState._stage, gameState);
    },
    onBind: (stage, difficulty, { reportSession, gameState }) => {
        const dots = Array.from(stage.querySelectorAll('.paint-dot'));
        const dotNotes = {
            blue: 'G',
            green: 'D',
            yellow: 'A',
            red: 'E',
        };

        // difficulty.speed: scales flourish playback tempo; speed=1.0 = 180 BPM (current behavior)
        // difficulty.complexity: adjusts creativityTarget; complexity=1 (medium) = 70 (current behavior)
        const flourishTempo = Math.round(180 * difficulty.speed);
        const complexityCreativityTargets = [50, 70, 90];

        gameState.score = 0;
        gameState.creativity = 0;
        gameState.tapCount = 0;
        gameState.rounds = 0;
        gameState.flourishPlayed = false;
        gameState.creativityTarget = complexityCreativityTargets[difficulty.complexity] ?? 70;
        gameState._tappedDots = new Set();
        gameState._dots = dots;
        gameState._stage = stage;

        gameState._onDeactivate = () => {
            stopTonePlayer();
        };

        dots.forEach((dot) => {
            bindTap(dot, () => {
                gameState.score += 30;
                gameState.creativity = Math.min(100, gameState.score > 0 ? gameState.creativity + 8 : gameState.creativity);
                gameState.tapCount += 1;
                gameState.rounds = Math.floor(gameState.tapCount / 4);
                const note = dotNotes[dot.dataset.painterDot];
                if (note) {
                    playToneNote(note, { duration: 0.2, volume: 0.16, type: 'triangle' });
                }
                gameState._tappedDots.add(dot.dataset.painterDot || dot.dataset.painter || dot.className);
                dot.classList.add('is-hit');
                setTimeout(() => dot.classList.remove('is-hit'), 220);
                refreshDisplay(stage, gameState);
                markChecklistIf(gameState._tappedDots.size >= 4, 'rp-pattern-1');
                markChecklistIf(gameState.tapCount >= 4, 'rp-pattern-2');
                markChecklistIf(gameState.creativity >= 70, 'rp-pattern-3');
                markChecklistIf(gameState.rounds >= 3, 'rp-pattern-4');
                if (gameState.creativity >= gameState.creativityTarget) {
                    if (!gameState.flourishPlayed) {
                        gameState.flourishPlayed = true;
                        playToneSequence(['G', 'D', 'A', 'E'], { tempo: flourishTempo, gap: 0.08, duration: 0.16, volume: 0.18, type: 'violin' });
                    }
                    reportSession();
                }
            });
        });

        refreshDisplay(stage, gameState);
    },
});

export { updateRhythmPainter as update, bind };
