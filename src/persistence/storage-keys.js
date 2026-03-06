/** Central registry of IndexedDB / localStorage key strings. */

// Practice events (sessions, scores, achievements)
/** Storage key for recorded practice/game/song events. */
export const EVENTS_KEY = 'panda-violin:events:v1';

// Recordings (audio blobs metadata)
/** Storage key for recording metadata. */
export const RECORDINGS_KEY = 'panda-violin:recordings:v1';

// UI state (persisted scroll positions, last view, etc.)
/** Storage key for persisted UI state. */
export const UI_STATE_KEY = 'panda-violin:ui-state:v1';

// Progress snapshot
/** Storage key for progress snapshots. */
export const PROGRESS_KEY = 'panda-violin:progress:v1';

// Adaptive ML model
/** Storage key for the adaptive model payload. */
export const ML_MODEL_KEY = 'panda-violin:ml:adaptive-v1';

// Adaptive ML event log
/** Storage key for adaptive-engine event history. */
export const ML_LOG_KEY = 'panda-violin:ml:events:v1';

// Recommendations cache
/** Storage key for cached recommendations. */
export const ML_RECS_KEY = 'panda-violin:ml:recs-v1';

// Curriculum + mission + mastery
/** Storage key for curriculum state. */
export const CURRICULUM_STATE_KEY = 'panda-violin:curriculum-state-v1';
/** Storage key for mission history. */
export const MISSION_HISTORY_KEY = 'panda-violin:mission-history-v1';
/** Storage key for song progression data. */
export const SONG_PROGRESS_KEY = 'panda-violin:song-progress-v2';
/** Storage key for game mastery data. */
export const GAME_MASTERY_KEY = 'panda-violin:game-mastery-v1';

// Realtime coaching
/** Storage key for realtime coaching profile settings. */
export const RT_PROFILE_KEY = 'panda-violin:rt:profile-v1';
/** Storage key for realtime event logs. */
export const RT_EVENT_LOG_KEY = 'panda-violin:rt:events-v1';
/** Storage key for realtime coaching policy settings. */
export const RT_POLICY_KEY = 'panda-violin:rt:policy-v1';
/** Storage key for realtime quality metrics. */
export const RT_QUALITY_KEY = 'panda-violin:rt:quality-v1';
/** Storage key for realtime UI preferences. */
export const RT_UI_PREFS_KEY = 'panda-violin:rt:ui-prefs-v1';

// Parent zone
/** Storage key for parent goal configuration. */
export const PARENT_GOAL_KEY = 'panda-violin:parent-goal-v1';
/** Storage key for the current parent PIN record. */
export const PARENT_PIN_KEY = 'panda-violin:parent-pin-v2';
/** Legacy storage key for migrated parent PIN data. */
export const PARENT_PIN_LEGACY_KEY = 'panda-violin:parent-pin-v1';
/** Storage key for temporary parent unlock state. */
export const PARENT_UNLOCK_KEY = 'panda-violin:parent-unlocked';

// Platform / install
/** Storage key for install-guide dismissal state. */
export const INSTALL_GUIDE_KEY = 'panda-violin:install-guide:v1';
/** Storage key for persistent-storage request attempts. */
export const PERSIST_REQUEST_KEY = 'panda-violin:persist-request-v1';

// Offline
/** Storage key for offline-mode state. */
export const OFFLINE_MODE_KEY = 'panda-violin:offline:mode-v1';
/** Storage key for offline integrity metrics. */
export const OFFLINE_METRICS_KEY = 'panda-violin:offline:metrics-v1';
/** Storage key for stored web-vitals sessions. */
export const WEB_VITALS_KEY = 'panda-violin:web-vitals-v1';

// Onboarding
/** Storage key for onboarding completion state. */
export const ONBOARDING_KEY = 'onboarding-complete';
