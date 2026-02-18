import { createGame } from './game-shell.js';
import {
    readLiveNumber,
    markChecklist,
    bindTap,
    playToneNote,
    playToneSequence,
    buildNoteSequence,
    updateScoreCombo,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { SOUNDS_CHANGE } from '../utils/event-names.js';

const updateDuetChallenge = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-duet-challenge input[id^="dc-step-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = document.querySelector('[data-duet="score"]');
    const comboEl = document.querySelector('[data-duet="combo"]');
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');
    if (scoreEl) scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : checked * 22);
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const { bind } = createGame({
    id: 'duet-challenge',
    computeAccuracy: (state) => state._sequence?.length
        ? (Math.max(0, state._sequence.length - (state._mistakes ?? 0)) / state._sequence.length) * 100
        : 0,
    onReset: (gameState) => {
        if (gameState._stopPartnerPlayback) gameState._stopPartnerPlayback();
        if (gameState._resetSession) gameState._resetSession();
    },
    onBind: (stage, difficulty, { reportSession, gameState }) => {
        const playButton = stage.querySelector('[data-duet="play"]');
        const buttons = Array.from(stage.querySelectorAll('.duet-btn'));
        const promptEl = stage.querySelector('[data-duet="prompt"]');
        const roundEl = stage.querySelector('[data-duet="round"]');
        const scoreEl = stage.querySelector('[data-duet="score"]');
        const comboEl = stage.querySelector('[data-duet="combo"]');
        const notesEl = stage.querySelector('.duet-notes');
        const audioMap = new Map(
            Array.from(stage.querySelectorAll('[data-duet-audio]')).map((audio) => [audio.dataset.duetAudio, audio])
        );
        const notePool = ['G', 'D', 'A', 'E'];
        let sequence = ['G', 'D', 'A', 'E'];
        // difficulty.speed: scales partner playback timeout; speed=1.0 = 900ms per note (current behavior)
        // difficulty.complexity: adjusts sequence length; complexity=1 (medium) = length 4 (current behavior)
        const duetSeqLengths = [3, 4, 5];
        const duetSeqLength = duetSeqLengths[difficulty.complexity] ?? 4;
        const partnerNoteTimeout = Math.round(900 / difficulty.speed);
        let seqIndex = 0;
        let combo = 0;
        let score = 0;
        let active = false;
        let isPlayingPartner = false;
        let partnerToken = 0;
        const comboTarget = 3;
        let round = 1;
        let mistakes = 0;

        // Initialize gameState
        gameState.score = 0;
        gameState._sequence = sequence;
        gameState._mistakes = 0;

        const updateScoreboard = () => updateScoreCombo(scoreEl, comboEl, score, combo);

        const buildSequence = () => {
            sequence = buildNoteSequence(notePool, duetSeqLength);
            gameState._sequence = sequence;
            if (notesEl) notesEl.textContent = sequence.join(' · ');
            if (roundEl) roundEl.textContent = `Round ${round}`;
            seqIndex = 0;
            mistakes = 0;
            gameState._mistakes = 0;
        };

        const updateSoundState = () => {
            if (playButton) playButton.disabled = !isSoundEnabled();
        };

        const playTone = (audio, token) => new Promise((resolve) => {
            if (!audio) {
                resolve();
                return;
            }
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                audio.removeEventListener('ended', finish);
                resolve();
            };
            if (token !== partnerToken) {
                resolve();
                return;
            }
            if (!isSoundEnabled()) {
                resolve();
                return;
            }
            audio.addEventListener('ended', finish);
            audio.currentTime = 0;
            audio.play().catch(() => {
                finish();
            });
            setTimeout(finish, partnerNoteTimeout);
        });

        const stopPartnerPlayback = () => {
            partnerToken += 1;
            isPlayingPartner = false;
            audioMap.forEach((audio) => {
                if (audio && !audio.paused) {
                    audio.pause();
                    audio.currentTime = 0;
                }
            });
            if (playButton) playButton.disabled = false;
        };

        const playPartnerSequence = async () => {
            if (isPlayingPartner) return;
            if (!isSoundEnabled()) {
                if (promptEl) promptEl.textContent = 'Sounds are off. Turn on Sounds to hear the partner.';
                return;
            }
            const token = partnerToken + 1;
            partnerToken = token;
            isPlayingPartner = true;
            if (playButton) playButton.disabled = true;
            if (promptEl) promptEl.textContent = 'Partner playing\u2026 get ready to respond.';
            for (const note of sequence) {
                if (token !== partnerToken) break;
                const audio = audioMap.get(note);
                await playTone(audio, token);
            }
            if (token === partnerToken) {
                if (playButton) playButton.disabled = false;
                isPlayingPartner = false;
            }
        };

        const setButtonsDisabled = (disabled) => {
            buttons.forEach((button) => {
                button.disabled = disabled;
            });
        };

        const doResetSession = () => {
            combo = 0;
            score = 0;
            seqIndex = 0;
            active = false;
            round = 1;
            mistakes = 0;
            gameState.score = 0;
            gameState._mistakes = 0;
            stopPartnerPlayback();
            updateScoreboard();
            buildSequence();
            if (promptEl) promptEl.textContent = 'Press play to hear the partner line.';
            setButtonsDisabled(true);
        };

        // Store helpers for onReset
        gameState._stopPartnerPlayback = stopPartnerPlayback;
        gameState._resetSession = doResetSession;

        bindTap(playButton, () => {
            if (!isSoundEnabled()) {
                if (promptEl) promptEl.textContent = 'Sounds are off. Turn on Sounds to hear the partner.';
                return;
            }
            active = false;
            buildSequence();
            if (promptEl) promptEl.textContent = `Partner plays: ${sequence.join(' \u00b7 ')}`;
            setButtonsDisabled(true);
            playPartnerSequence().then(() => {
                active = true;
                setButtonsDisabled(false);
                if (promptEl) promptEl.textContent = `Your turn: ${sequence.join(' \u00b7 ')}`;
            });
            markChecklist('dc-step-1');
        });

        buttons.forEach((button) => {
            bindTap(button, () => {
                if (isPlayingPartner) {
                    if (promptEl) promptEl.textContent = 'Wait for the partner line to finish.';
                    return;
                }
                if (!active) {
                    if (promptEl) promptEl.textContent = 'Press play to hear the partner line.';
                    return;
                }
                const note = button.dataset.duetNote;
                if (note) {
                    playToneNote(note, { duration: 0.2, volume: 0.18, type: 'triangle' });
                }
                if (note === sequence[seqIndex]) {
                    combo += 1;
                    score += 15 + combo * 2;
                    gameState.score = score;
                    seqIndex += 1;
                    if (seqIndex === 1) markChecklist('dc-step-2');
                    if (combo >= comboTarget) markChecklist('dc-step-3');
                    if (seqIndex >= sequence.length) {
                        active = false;
                        if (promptEl) promptEl.textContent = 'Great duet! Play again for a new combo.';
                        markChecklist('dc-step-4');
                        playToneSequence(sequence, { tempo: 160, gap: 0.1, duration: 0.18, volume: 0.16, type: 'sine' });
                        reportSession();
                        round += 1;
                    } else {
                        if (promptEl) promptEl.textContent = `Your turn: ${sequence.slice(seqIndex).join(' \u00b7 ')}`;
                    }
                } else {
                    combo = 0;
                    mistakes += 1;
                    gameState._mistakes = mistakes;
                    seqIndex = 0;
                    if (promptEl) promptEl.textContent = 'Try again from the start.';
                    playToneNote('F', { duration: 0.16, volume: 0.12, type: 'sawtooth' });
                }
                updateScoreboard();
            });
        });

        document.addEventListener(SOUNDS_CHANGE, (event) => {
            if (event.detail?.enabled === false) {
                stopPartnerPlayback();
            }
            updateSoundState();
        });

        updateSoundState();
        setButtonsDisabled(true);
        buildSequence();
    },
});

export { updateDuetChallenge as update, bind };
