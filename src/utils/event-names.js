/** Central registry of custom event name strings (panda:*). */

// Audio / sound
/** Emitted when sound settings change. */
export const SOUNDS_CHANGE = 'panda:sounds-change';

// ML / adaptive engine
/** Emitted when adaptive scoring updates. */
export const ML_UPDATE = 'panda:ml-update';
/** Emitted when adaptive scoring state resets. */
export const ML_RESET = 'panda:ml-reset';
/** Emitted when adaptive recommendations are recalculated. */
export const ML_RECS = 'panda:ml-recs';

// Practice & game recording
/** Emitted when a practice session is recorded. */
export const PRACTICE_RECORDED = 'panda:practice-recorded';
/** Emitted when a game session is recorded. */
export const GAME_RECORDED = 'panda:game-recorded';
/** Emitted when the player asks to replay a game. */
export const GAME_PLAY_AGAIN = 'panda:game-play-again';
/** Emitted when a song practice session is recorded. */
export const SONG_RECORDED = 'panda:song-recorded';
/** Emitted when a guided practice step starts. */
export const PRACTICE_STEP_STARTED = 'panda:practice-step-started';
/** Emitted when a guided practice step completes. */
export const PRACTICE_STEP_COMPLETED = 'panda:practice-step-completed';
/** Emitted when the mission model changes. */
export const MISSION_UPDATED = 'panda:mission-updated';
/** Emitted when a song section is completed. */
export const SONG_SECTION_COMPLETED = 'panda:song-section-completed';
/** Emitted when game mastery data changes. */
export const GAME_MASTERY_UPDATED = 'panda:game-mastery-updated';

// Recordings (audio)
/** Emitted when recording inventory changes. */
export const RECORDINGS_UPDATED = 'panda:recordings-updated';

// Persistence
/** Emitted after persisted state is applied to the app. */
export const PERSIST_APPLIED = 'panda:persist-applied';

// Lesson plan / coaching
/** Emitted when a lesson-plan step advances. */
export const LESSON_STEP = 'panda:lesson-step';
/** Emitted when a lesson plan completes. */
export const LESSON_COMPLETE = 'panda:lesson-complete';
/** Emitted when a coach mission completes. */
export const COACH_MISSION_COMPLETE = 'panda:coach-mission-complete';

// Goals
/** Emitted when a goal target changes. */
export const GOAL_TARGET_CHANGE = 'panda:goal-target-change';
// Offline
/** Emitted when offline-only mode is toggled. */
export const OFFLINE_MODE_CHANGE = 'panda:offline-mode-change';

// Achievements
/** Emitted when an achievement unlocks. */
export const ACHIEVEMENT_UNLOCKED = 'panda:achievement-unlocked';

// Realtime coaching / session
/** Emitted when a realtime coaching session starts. */
export const RT_SESSION_STARTED = 'panda:rt-session-started';
/** Emitted when a realtime coaching session stops. */
export const RT_SESSION_STOPPED = 'panda:rt-session-stopped';
/** Emitted when a realtime cue is delivered. */
export const RT_CUE = 'panda:rt-cue';
/** Emitted when realtime state changes. */
export const RT_STATE = 'panda:rt-state';
/** Emitted when realtime coaching falls back to a non-live mode. */
export const RT_FALLBACK = 'panda:rt-fallback';
/** Emitted when a parent override changes realtime behavior. */
export const RT_PARENT_OVERRIDE = 'panda:rt-parent-override';
/** Emitted when realtime session quality changes. */
export const RT_QUALITY = 'panda:rt-quality';
/** Emitted when realtime feature availability changes. */
export const RT_FEATURE = 'panda:rt-feature';

// View lifecycle
/** Emitted after a view finishes rendering. */
export const VIEW_RENDERED = 'panda:view-rendered';

// Performance monitoring
/** Emitted when web-vitals history is updated. */
export const WEB_VITALS_UPDATED = 'panda:web-vitals-updated';

/**
 * Dispatches a namespaced custom event on `document`.
 *
 * @param {string} name
 * @param {any} detail
 * @returns {void}
 */
export const emitEvent = (name, detail) => {
    document.dispatchEvent(new CustomEvent(name, { detail }));
};
