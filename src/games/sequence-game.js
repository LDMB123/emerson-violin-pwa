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
    markChecklist,
    markChecklistIf,
    playToneNote,
    playToneSequence,
    stopTonePlayer,
    buildNoteSequence,
} from './shared.js';
import { bindGameSessionLifecycle } from './game-session-lifecycle.js';
import { updateSequenceSummary } from './sequence-game-view.js';
import { createSequenceGameRuntime } from './sequence-game-runtime.js';
import { handleSequenceGameTap } from './sequence-game-input.js';
import { createSequenceGameSessionHandlers } from './sequence-game-session.js';
import { createSequenceGameViewRuntime } from './sequence-game-view-runtime.js';
import { cleanupSequenceGameBinding } from './sequence-game-lifecycle.js';
import { bindSequenceGameMicrophone } from './sequence-game-button-bindings.js';
import { attachSequenceGameTuning } from './sequence-game-tuning.js';
import { StringQuestCanvasEngine } from './string-quest-canvas.js';

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
    let lifecycleCleanup = null;
    let reportResult = null;

    /**
     * update() — lightweight display refresh called when the view is first rendered.
     * Reads checked checklist inputs and shows a fallback score/combo if no live
     * values exist yet (mirrors pattern in original pizzicato.js / string-quest.js).
     */
    const update = () => {
        updateSequenceSummary({
            viewId,
            stepPrefix,
            stepScore,
            scoreEl: cachedScoreEl(),
            comboEl: cachedComboEl(),
        });
    };

    /**
     * bind(difficulty) — attaches all interactive game logic to the DOM.
     */
    const bind = (difficulty = { speed: 1.0, complexity: 1 }) => {
        const stage = document.querySelector(viewId);
        if (!stage) return;
        cleanupSequenceGameBinding({ lifecycleCleanup, reportResult });
        lifecycleCleanup = null;
        reportResult = null;

        // difficulty.complexity adjusts sequence length (speed has no timing loop here)
        const sequenceLength = COMPLEXITY_SEQ_LENGTHS[difficulty.complexity] ?? 4;

        const runtimeApi = createSequenceGameRuntime({
            notePool: NOTE_POOL,
            sequenceLength,
            buildNoteSequence,
        });
        const { runtime, buildSequence } = runtimeApi;

        // Auto-Initialize Canvas Engine if DOM hook exists
        let canvasEngine = null;
        const canvasEl = stage.querySelector(`#${id}-canvas`);
        if (canvasEl) {
            // pizzicato is vertical, string-quest is horizontal
            const isHorizontal = id === 'string-quest';
            canvasEngine = new StringQuestCanvasEngine(canvasEl, isHorizontal);
            canvasEngine.start();
        }

        const {
            buttons,
            updateTargets,
            updateScoreboard,
        } = createSequenceGameViewRuntime({
            stage,
            prefix,
            statusKey,
            buttonClass,
            targetDataAttr,
            comboTarget,
            getSequence: () => runtime.sequence,
            getSeqIndex: () => runtime.seqIndex,
            getScore: () => runtime.score,
            getCombo: () => runtime.combo,
        });

        // Patch updateTargets to also send prompt to the Canvas
        const originalUpdateTargets = updateTargets;
        const patchedUpdateTargets = () => {
            originalUpdateTargets();
            if (canvasEngine && runtime.sequence.length) {
                const targetNote = runtime.sequence[runtime.seqIndex];
                if (targetNote) canvasEngine.setPromptTarget(targetNote);
            }
        };

        reportResult = attachSequenceGameTuning({
            id,
            stage,
            buildSequence,
            updateTargets: patchedUpdateTargets,
        });

        const { reportSession, callbackState, resetSession } = createSequenceGameSessionHandlers({
            id,
            comboTarget,
            reportResult,
            stage,
            difficulty,
            runtime,
            runtimeApi,
            onReset: (state) => {
                if (canvasEngine) canvasEngine.reset();
                if (onReset) onReset(state);
            },
            markChecklist,
            markChecklistIf,
            stopTonePlayer,
            buildSequence,
            updateTargets: patchedUpdateTargets,
            updateScoreboard,
        });

        patchedUpdateTargets();

        const applyButtonTap = (note) => {
            if (canvasEngine) {
                canvasEngine.pluck(note);
            }

            const nextState = handleSequenceGameTap({
                note,
                noteOptions,
                playToneNote,
                sequence: runtime.sequence,
                seqIndex: runtime.seqIndex,
                combo: runtime.combo,
                score: runtime.score,
                misses: runtime.misses,
                baseScore,
                comboMult,
                missPenalty,
                onCorrectHit,
                callbackState,
                completionChecklistId,
                comboChecklistId,
                comboTarget,
                markChecklist,
                markChecklistIf,
                reportSession,
                buildSequence,
                playToneSequence,
                seqOptions,
                updateTargets: patchedUpdateTargets,
                updateScoreboard,
            });

            runtimeApi.applyTapResult(nextState);
        };

        // If we are using the Canvas, wire it up for taps directly
        if (canvasEngine) {
            canvasEngine.onStringPluck = (stringId) => {
                applyButtonTap(stringId);
            };
        }

        // Keep DOM buttons for legacy/accessibility
        buttons.forEach((btn) => {
            btn.addEventListener('pointerdown', () => {
                // Prevent double firing if canvas is tapped through absolute positioning, etc.
                if (canvasEngine) return;
                const note = btn.dataset[btnDataAttr];
                if (!note) return;
                applyButtonTap(note);
            });
            // Handle spacebar/enter
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (canvasEngine) return; // Ignore if canvas handles it (unlikely for kb, but safe)
                    const note = btn.dataset[btnDataAttr];
                    if (note) applyButtonTap(note);
                }
            });
        });

        const cleanupMic = bindSequenceGameMicrophone({
            hashId,
            noteOptions,
            playToneNote,
            getRuntimeState: () => ({
                sequence: runtime.sequence,
                seqIndex: runtime.seqIndex,
                combo: runtime.combo,
                score: runtime.score,
                misses: runtime.misses,
            }),
            baseScore,
            comboMult,
            missPenalty,
            onCorrectHit,
            callbackState,
            completionChecklistId,
            comboChecklistId,
            comboTarget,
            markChecklist,
            markChecklistIf,
            reportSession,
            buildSequence,
            playToneSequence,
            seqOptions,
            updateTargets: patchedUpdateTargets,
            updateScoreboard,
            applyTapResult: (nextState) => {
                // Visualize mic hits in canvas
                if (canvasEngine) {
                    canvasEngine.pluck(nextState.note);
                }
                runtimeApi.applyTapResult(nextState);
            },
        });

        const baseSessionCleanup = bindGameSessionLifecycle({
            hashId,
            onReset: resetSession,
            onDeactivate: () => {
                stopTonePlayer();
                if (canvasEngine) canvasEngine.stop();
            },
            onReport: reportSession,
        });

        lifecycleCleanup = () => {
            cleanupMic();
            baseSessionCleanup();
            if (canvasEngine) canvasEngine.destroy();
        };
    };

    return { update, bind };
}
