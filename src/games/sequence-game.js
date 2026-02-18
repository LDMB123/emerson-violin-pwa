/**
 * sequence-game.js — shared factory for sequence-based string games.
 *
 * Both pizzicato.js and string-quest.js share the same core loop:
 *   - Build a random note sequence from a pool
 *   - Highlight the current target note on-screen
 *   - Accept button taps and score correct/incorrect hits
 *   - Track combos and report session results via attachTuning
 *   - Reset on hash navigation back to the game view
 *
 * createSequenceGame(config) encapsulates all of that shared logic and
 * returns { update, bind } so each game file becomes a thin wrapper.
 *
 * Config properties:
 *   id              {string}   Game id passed to attachTuning/recordGameEvent,
 *                              e.g. 'pizzicato' or 'string-quest'
 *   prefix          {string}   Data-attribute prefix used in DOM, e.g. 'pizzicato' or 'string'
 *   viewId          {string}   CSS selector for the root game element, e.g. '#view-game-pizzicato'
 *   buttonClass     {string}   CSS selector for tap buttons, e.g. '.pizzicato-btn'
 *   btnDataAttr     {string}   dataset camelCase key for button note, e.g. 'pizzicatoBtn'
 *   targetDataAttr  {string}   dataset camelCase key on target elements, e.g. 'pizzicatoTarget'.
 *                              The CSS attribute selector is derived as data-{prefix}-target.
 *   statusKey       {string}   Value of data-{prefix}="{statusKey}" for the status/prompt el
 *                              (pizzicato uses "status"; string-quest uses "prompt")
 *   comboTarget     {number}   Combo goal shown in status text and used for accuracy calc
 *   baseScore       {number}   Per-hit score added before combo multiplier
 *   comboMult       {number}   Per-hit multiplier: score += baseScore + combo * comboMult
 *   missPenalty     {number}   Score subtracted on a miss
 *   noteOptions     {object}   Options passed to playToneNote on each button tap
 *   seqOptions      {object}   Options passed to playToneSequence on sequence completion
 *   completionChecklistId {string}  Checklist id to mark when a full sequence is completed
 *   comboChecklistId      {string}  Checklist id to mark when combo >= comboTarget
 *   stepPrefix      {string}   Input id prefix for update() checklist query, e.g. 'pz' or 'sq'
 *   stepScore       {number}   Per-checked-step score used in update() fallback display;
 *                              also used as the completion bonus (same value in both games)
 *   hashId          {string}   Hash string compared against window.location.hash to detect
 *                              navigation back to this view, e.g. '#view-game-pizzicato'.
 *                              Defaults to viewId. Provide explicitly if viewId is a compound
 *                              CSS selector that does not equal the expected hash string.
 *   onCorrectHit    {function} Optional callback(note, state) for per-hit side effects.
 *                              Runs after score/seqIndex are updated but before sequence
 *                              completion check. state has: combo, score, seqIndex, sequence,
 *                              hitNotes, lastCorrectNote (writable), markChecklist,
 *                              markChecklistIf.
 *                              NOTE: callers that track cross-string transitions (e.g. D→A
 *                              detection) MUST update state.lastCorrectNote inside this
 *                              callback; the factory does not set it automatically.
 *   onReset         {function} Optional callback(state) invoked during session reset after
 *                              base state is cleared (combo/score/seqIndex/hitNotes/
 *                              lastCorrectNote), for any game-specific cleanup.
 */

import {
    cachedEl,
    readLiveNumber,
    markChecklist,
    markChecklistIf,
    setDifficultyBadge,
    recordGameEvent,
    attachTuning,
    bindTap,
    playToneNote,
    playToneSequence,
    buildNoteSequence,
    updateScoreCombo,
} from './shared.js';

const NOTE_POOL = ['G', 'D', 'A', 'E'];
const COMPLEXITY_SEQ_LENGTHS = [3, 4, 5];

/**
 * createSequenceGame(config)
 *
 * Returns { update, bind } for a sequence-based string game.
 */
export function createSequenceGame(config) {
    const {
        id,
        prefix,
        viewId,
        hashId = viewId,
        buttonClass,
        btnDataAttr,
        targetDataAttr,
        statusKey,
        comboTarget,
        baseScore,
        comboMult,
        missPenalty,
        noteOptions,
        seqOptions,
        completionChecklistId,
        comboChecklistId,
        stepPrefix,
        stepScore,
        onCorrectHit,
        onReset,
    } = config;

    // Cached element lookups for update() which is called before bind() runs.
    const cachedScoreEl = cachedEl(`[data-${prefix}="score"]`);
    const cachedComboEl = cachedEl(`[data-${prefix}="combo"]`);

    /**
     * update() — lightweight display refresh called when the view is first rendered.
     * Reads checked checklist inputs and shows a fallback score/combo if no live
     * values exist yet (mirrors pattern in original pizzicato.js / string-quest.js).
     */
    const update = () => {
        const inputs = Array.from(
            document.querySelectorAll(`${viewId} input[id^="${stepPrefix}-step-"]`),
        );
        if (!inputs.length) return;
        const checked = inputs.filter((input) => input.checked).length;
        const scoreEl = cachedScoreEl();
        const comboEl = cachedComboEl();
        const liveScore = readLiveNumber(scoreEl, 'liveScore');
        const liveCombo = readLiveNumber(comboEl, 'liveCombo');
        if (scoreEl) {
            scoreEl.textContent = String(
                Number.isFinite(liveScore)
                    ? liveScore
                    : checked * stepScore + (checked === inputs.length ? stepScore : 0),
            );
        }
        if (comboEl) {
            const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
            comboEl.textContent = `x${combo}`;
        }
    };

    /**
     * bind(difficulty) — attaches all interactive game logic to the DOM.
     */
    const bind = (difficulty = { speed: 1.0, complexity: 1 }) => {
        const stage = document.querySelector(viewId);
        if (!stage) return;

        const scoreEl = stage.querySelector(`[data-${prefix}="score"]`);
        const comboEl = stage.querySelector(`[data-${prefix}="combo"]`);
        const statusEl = stage.querySelector(`[data-${prefix}="${statusKey}"]`);
        const sequenceEl = stage.querySelector(`[data-${prefix}="sequence"]`);
        const buttons = Array.from(stage.querySelectorAll(buttonClass));
        // CSS attribute uses kebab-case (data-pizzicato-target), dataset key is camelCase.
        const targets = Array.from(stage.querySelectorAll(`[data-${prefix}-target]`));

        // difficulty.complexity adjusts sequence length (speed has no timing loop here)
        const sequenceLength = COMPLEXITY_SEQ_LENGTHS[difficulty.complexity] ?? 4;

        let sequence = NOTE_POOL.slice();
        let seqIndex = 0;
        let combo = 0;
        let score = 0;

        // Extra state exposed to callbacks.
        // hitNotes is used by pizzicato for unique-note tracking.
        // lastCorrectNote is used by string-quest for D→A crossing detection.
        const hitNotes = new Set();
        let lastCorrectNote = null;

        const buildSequence = () => {
            sequence = buildNoteSequence(NOTE_POOL, sequenceLength);
            seqIndex = 0;
        };

        const updateTargets = (message) => {
            const targetNote = sequence[seqIndex];
            targets.forEach((target) => {
                target.classList.toggle(
                    'is-target',
                    target.dataset[targetDataAttr] === targetNote,
                );
            });
            if (statusEl) {
                statusEl.textContent =
                    message || `Target: ${targetNote} string · Combo goal x${comboTarget}.`;
            }
            if (sequenceEl) {
                sequenceEl.textContent = `Sequence: ${sequence.join(' · ')}`;
            }
        };

        const updateScoreboard = () => updateScoreCombo(scoreEl, comboEl, score, combo);

        const reportResult = attachTuning(id, (tuning) => {
            buildSequence();
            setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
            updateTargets();
        });

        const reportSession = () => {
            if (score <= 0) return;
            const accuracy = comboTarget ? Math.min(1, combo / comboTarget) * 100 : 0;
            reportResult({ accuracy, score });
            recordGameEvent(id, { accuracy, score });
        };

        // Proxy object passed to callbacks so they can read/write game state
        // without closing over it directly in the factory.
        const callbackState = {
            get combo() { return combo; },
            get score() { return score; },
            get seqIndex() { return seqIndex; },
            get sequence() { return sequence; },
            get hitNotes() { return hitNotes; },
            get lastCorrectNote() { return lastCorrectNote; },
            set lastCorrectNote(v) { lastCorrectNote = v; },
            markChecklist,
            markChecklistIf,
        };

        const resetSession = () => {
            combo = 0;
            score = 0;
            seqIndex = 0;
            hitNotes.clear();
            lastCorrectNote = null;
            if (onReset) onReset(callbackState);
            buildSequence();
            updateTargets();
            updateScoreboard();
        };

        updateTargets();

        buttons.forEach((button) => {
            bindTap(button, () => {
                const note = button.dataset[btnDataAttr];
                if (note) {
                    playToneNote(note, noteOptions);
                }
                if (note === sequence[seqIndex]) {
                    combo += 1;
                    score += baseScore + combo * comboMult;
                    seqIndex = (seqIndex + 1) % sequence.length;

                    // Per-hit side effects: unique-note tracking (pizzicato),
                    // D→A crossing detection (string-quest), etc.
                    if (onCorrectHit) onCorrectHit(note, callbackState);

                    if (seqIndex === 0) {
                        // Sequence complete — play flourish, report, rebuild.
                        const completedSequence = sequence.slice();
                        markChecklist(completionChecklistId);
                        reportSession();
                        buildSequence();
                        playToneSequence(completedSequence, seqOptions);
                    }
                    updateTargets();
                } else {
                    combo = 0;
                    score = Math.max(0, score - missPenalty);
                    updateTargets(`Missed. Aim for ${sequence[seqIndex]} next.`);
                }
                updateScoreboard();
                markChecklistIf(combo >= comboTarget, comboChecklistId);
            });
        });

        window.addEventListener(
            'hashchange',
            () => {
                if (window.location.hash === hashId) {
                    resetSession();
                    return;
                }
                reportSession();
            },
            { passive: true },
        );
    };

    return { update, bind };
}
