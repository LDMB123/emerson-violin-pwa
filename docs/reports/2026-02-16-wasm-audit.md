# WASM Module Audit

## panda-core

**Exports:**
- `PlayerProgress` struct
  - `new()` - constructor
  - `add_xp(amount: u32) -> bool` - add XP and check level up
  - `xp_to_next_level() -> u32` - XP needed for next level
  - `level_progress() -> u8` - progress percentage 0-100
  - `log_practice(minutes: u32, streak_days: u32) -> u32` - log practice and award XP
  - `log_song_complete(accuracy: u8) -> u32` - log song completion
  - `log_game_score(game_id: &str, score: u32) -> u32` - log game score
  - Getters: `xp`, `level`, `streak`, `total_minutes`, `songs_completed`, `games_played`

- `AchievementTracker` struct
  - `new()` - constructor
  - `unlock(id: &str, timestamp: u64) -> bool` - unlock achievement
  - `check_progress(progress: &PlayerProgress, timestamp: u64) -> Vec<String>` - check progress-based achievements
  - `unlocked_count() -> usize` - count unlocked
  - `total_count() -> usize` - total achievements
  - `is_unlocked(id: &str) -> bool` - check if unlocked

- `Achievement` struct (internal, exposed via tracker)
  - Getters: `id`, `name`, `description`, `icon`, `unlocked`

- `SkillProfile` struct
  - `new()` - constructor
  - `update_pitch(score: f32)` - update pitch skill
  - `update_rhythm(score: f32)` - update rhythm skill
  - `update_bow_control(score: f32)` - update bow control skill
  - `update_posture(score: f32)` - update posture skill
  - `update_reading(score: f32)` - update reading skill
  - `update_skill(category: SkillCategory, score: f32)` - generic update (internal)
  - `weakest_skill() -> String` - identify weakest skill
  - `overall() -> f32` - average skill level
  - Getters: `pitch`, `rhythm`, `bow_control`, `posture`, `reading`

- `SkillCategory` enum
  - Pitch, Rhythm, BowControl, Posture, Reading

- `GameTimer` struct
  - `new(bpm: f32)` - constructor
  - `start(timestamp: f64)` - start timer
  - `get_beat(timestamp: f64) -> f32` - current beat position
  - `score_tap(timestamp: f64, target_beat: u32) -> u8` - score rhythm tap (0=miss, 1=good, 2=perfect)
  - `set_bpm(bpm: f32)` - update BPM
  - Getters: `bpm`, `ms_per_beat`

- `XpRewards` struct
  - Fields: `per_minute`, `song_complete`, `game_perfect`, `streak_multiplier`

- Standalone functions:
  - `init()` - WASM initialization (panic hook)
  - `calculate_streak(practice_dates: &[u32]) -> u32` - calculate practice streak
  - `calculate_difficulty(recent_scores: &[u8]) -> u8` - adaptive difficulty

**Used in JS:**
- `src/progress/progress.js` - imports `PlayerProgress`, `AchievementTracker`, `SkillProfile`, `SkillCategory`, `calculate_streak`
  - Creates progress tracking instances
  - Logs practice, songs, games
  - Checks achievements
  - Updates skill profile based on activities
- `src/analysis/session-review.js` - imports `SkillProfile`, `SkillCategory`
  - Creates skill profile for session analysis
  - Updates skills based on practice events

**Size:** 96,293 bytes (94 KB)

**Unused exports:**
- `GameTimer` - rhythm game timing (NOT used, potentially for future rhythm games)
- `XpRewards` - XP reward configuration (NOT used, hardcoded values in PlayerProgress)
- `calculate_difficulty` - adaptive difficulty (NOT used, no dynamic difficulty impl)
- `SkillProfile.update_skill` - only called internally via specific methods

## panda-audio

**Exports:**
- `PitchDetector` struct
  - `new(sample_rate: f32, buffer_size: usize)` - constructor
  - `detect(buffer: &[f32]) -> PitchResult` - detect pitch from audio buffer
  - `get_nearest_string(frequency: f32) -> String` - get nearest violin string
  - `set_volume_threshold(threshold: f32)` - set detection threshold
  - `set_tune_tolerance(cents: i32)` - set "in tune" tolerance

- `PitchResult` struct
  - Getters: `frequency`, `note`, `cents`, `volume`, `confidence`, `in_tune`

- Standalone functions:
  - `init()` - WASM initialization (panic hook)
  - `generate_tone_buffer(frequency: f32, sample_rate: f32, duration_ms: u32) -> Vec<f32>` - generate reference tone
  - `string_frequency(string: &str) -> f32` - get frequency for violin string name

**Used in JS:**
- `src/worklets/tuner-processor.js` - imports `initWasm` (default), `PitchDetector`
  - Creates PitchDetector instance in AudioWorklet
  - Real-time pitch detection for tuner
  - Sets tolerance and volume threshold

**Size:** 84,144 bytes (82 KB)

**Unused exports:**
- `PitchResult.get_nearest_string` - NOT directly called (functionality exists but unused)
- `generate_tone_buffer` - NOT used (tone generation happens in JS tone-player.js)
- `string_frequency` - NOT used (constants duplicated in JS)

## Optimization Opportunities

**Dead Code in panda-core:**
- `GameTimer` (13 KB estimated) - complete struct unused
- `calculate_difficulty` function - unused, 1-2 KB
- `XpRewards` struct - exported but never instantiated

**Dead Code in panda-audio:**
- `generate_tone_buffer` function - 3-4 KB estimated
- `string_frequency` function - minimal, <1 KB
- `get_nearest_string` method - functionality present but unused

**Size Optimization Options:**

1. **Remove unused exports (recommended):**
   - Remove `GameTimer` from panda-core → save ~13 KB
   - Remove `calculate_difficulty` from panda-core → save ~2 KB
   - Remove `XpRewards` public fields (keep as internal) → save ~1 KB
   - Remove `generate_tone_buffer` from panda-audio → save ~4 KB
   - Remove `string_frequency` from panda-audio → save ~1 KB
   - **Total potential savings: ~21 KB (12% reduction)**

2. **Code splitting (future consideration):**
   - panda-core could be split into:
     - core.wasm (PlayerProgress, SkillProfile) - 45 KB
     - achievements.wasm (AchievementTracker) - 25 KB
     - game-timing.wasm (GameTimer, if needed) - 15 KB
   - Would enable lazy loading achievements module

3. **Compression (already handled by PWA):**
   - WASM served via service worker with gzip
   - Current sizes acceptable for PWA

**Usage Patterns:**

Both modules are lazy-loaded via dynamic imports:
- panda-audio loads in AudioWorklet (tuner only)
- panda-core loads on-demand (progress/analysis pages)

No performance issues observed with current sizes.

**Recommendation:**

**Priority 1:** Remove unused exports to reduce bundle size by ~21 KB
- Remove `GameTimer`, `calculate_difficulty`, `XpRewards` exports from panda-core
- Remove `generate_tone_buffer`, `string_frequency` from panda-audio

**Priority 2:** Document or implement features for "future use" exports
- If GameTimer is planned, add to roadmap
- Otherwise remove to avoid maintenance burden

**Priority 3:** No immediate action needed for code splitting
- Current lazy loading strategy is effective
- Total WASM size (180 KB) acceptable for PWA
