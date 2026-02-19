/** Central registry of IndexedDB / localStorage key strings. */

// Practice events (sessions, scores, achievements)
export const EVENTS_KEY = 'panda-violin:events:v1';

// Recordings (audio blobs metadata)
export const RECORDINGS_KEY = 'panda-violin:recordings:v1';

// UI state (persisted scroll positions, last view, etc.)
export const UI_STATE_KEY = 'panda-violin:ui-state:v1';

// Progress snapshot
export const PROGRESS_KEY = 'panda-violin:progress:v1';

// Adaptive ML model
export const ML_MODEL_KEY = 'panda-violin:ml:adaptive-v1';

// Adaptive ML event log
export const ML_LOG_KEY = 'panda-violin:ml:events:v1';

// Recommendations cache
export const ML_RECS_KEY = 'panda-violin:ml:recs-v1';

// Curriculum + mission + mastery
export const CURRICULUM_STATE_KEY = 'panda-violin:curriculum-state-v1';
export const MISSION_HISTORY_KEY = 'panda-violin:mission-history-v1';
export const SONG_PROGRESS_KEY = 'panda-violin:song-progress-v2';
export const GAME_MASTERY_KEY = 'panda-violin:game-mastery-v1';

// Realtime coaching
export const RT_PROFILE_KEY = 'panda-violin:rt:profile-v1';
export const RT_EVENT_LOG_KEY = 'panda-violin:rt:events-v1';
export const RT_POLICY_KEY = 'panda-violin:rt:policy-v1';
export const RT_QUALITY_KEY = 'panda-violin:rt:quality-v1';
export const RT_UI_PREFS_KEY = 'panda-violin:rt:ui-prefs-v1';

// Parent zone
export const PARENT_GOAL_KEY = 'panda-violin:parent-goal-v1';
export const PARENT_PIN_KEY = 'panda-violin:parent-pin-v2';
export const PARENT_PIN_LEGACY_KEY = 'panda-violin:parent-pin-v1';
export const PARENT_UNLOCK_KEY = 'panda-violin:parent-unlocked';

// Platform / install
export const INSTALL_GUIDE_KEY = 'panda-violin:install-guide:v1';
export const INSTALL_TOAST_KEY = 'panda-violin:install-toast:v1';
export const PERSIST_REQUEST_KEY = 'panda-violin:persist-request-v1';

// Offline
export const OFFLINE_MODE_KEY = 'panda-violin:offline:mode-v1';
export const OFFLINE_METRICS_KEY = 'panda-violin:offline:metrics-v1';

// Onboarding
export const ONBOARDING_KEY = 'onboarding-complete';
