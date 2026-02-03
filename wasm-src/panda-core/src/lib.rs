//! Panda Core - Business Logic Engine
//!
//! This WASM module provides the core business logic for the Panda Violin app:
//! - XP and leveling system
//! - Achievement tracking
//! - Practice session management
//! - Skill profiling with k-means clustering
//! - Lesson state machine

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use js_sys::Date;

// Initialize panic hook
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

// ============================================================================
// XP & Leveling System
// ============================================================================

/// XP required for each level (exponential curve)
const LEVEL_XP: [u32; 20] = [
    0,      // Level 1
    100,    // Level 2
    250,    // Level 3
    500,    // Level 4
    850,    // Level 5
    1300,   // Level 6
    1900,   // Level 7
    2650,   // Level 8
    3550,   // Level 9
    4600,   // Level 10
    5850,   // Level 11
    7300,   // Level 12
    8950,   // Level 13
    10800,  // Level 14
    12900,  // Level 15
    15250,  // Level 16
    17900,  // Level 17
    20850,  // Level 18
    24100,  // Level 19
    27700,  // Level 20
];

/// XP reward multipliers
#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub struct XpRewards {
    /// Base XP per minute of practice
    pub per_minute: u32,
    /// Bonus for completing a song
    pub song_complete: u32,
    /// Bonus for perfect score in a game
    pub game_perfect: u32,
    /// Multiplier for streak days
    pub streak_multiplier: f32,
}

impl Default for XpRewards {
    fn default() -> Self {
        XpRewards {
            per_minute: 10,
            song_complete: 25,
            game_perfect: 50,
            streak_multiplier: 1.0,
        }
    }
}

/// Player progress state
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PlayerProgress {
    /// Current XP total
    xp: u32,
    /// Current level
    level: u8,
    /// Current streak in days
    streak: u32,
    /// Total practice time in minutes
    total_minutes: u32,
    /// Songs completed count
    songs_completed: u32,
    /// Games played count
    games_played: u32,
    /// Best scores per game (game_id -> score)
    #[serde(skip)]
    game_scores: HashMap<String, u32>,
}

#[wasm_bindgen]
impl PlayerProgress {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PlayerProgress {
        PlayerProgress {
            xp: 0,
            level: 1,
            streak: 0,
            total_minutes: 0,
            songs_completed: 0,
            games_played: 0,
            game_scores: HashMap::new(),
        }
    }

    /// Add XP and check for level up
    #[wasm_bindgen]
    pub fn add_xp(&mut self, amount: u32) -> bool {
        self.xp += amount;
        self.check_level_up()
    }

    /// Check and apply level up if earned
    fn check_level_up(&mut self) -> bool {
        let new_level = self.calculate_level();
        if new_level > self.level {
            self.level = new_level;
            true
        } else {
            false
        }
    }

    /// Calculate level from XP
    fn calculate_level(&self) -> u8 {
        for (level, &required_xp) in LEVEL_XP.iter().enumerate().rev() {
            if self.xp >= required_xp {
                return (level + 1) as u8;
            }
        }
        1
    }

    /// Get XP needed for next level
    #[wasm_bindgen]
    pub fn xp_to_next_level(&self) -> u32 {
        if self.level >= 20 {
            return 0;
        }
        let next_level_xp = LEVEL_XP[self.level as usize];
        if self.xp >= next_level_xp {
            0
        } else {
            next_level_xp - self.xp
        }
    }

    /// Get progress percentage to next level (0-100)
    #[wasm_bindgen]
    pub fn level_progress(&self) -> u8 {
        if self.level >= 20 {
            return 100;
        }
        let current_level_xp = LEVEL_XP[(self.level - 1) as usize];
        let next_level_xp = LEVEL_XP[self.level as usize];
        let level_range = next_level_xp - current_level_xp;
        let progress = self.xp - current_level_xp;
        ((progress as f32 / level_range as f32) * 100.0).min(100.0) as u8
    }

    /// Log practice time and award XP
    #[wasm_bindgen]
    pub fn log_practice(&mut self, minutes: u32, streak_days: u32) -> u32 {
        self.total_minutes += minutes;
        self.streak = streak_days;

        // Calculate streak multiplier (caps at 2x)
        let streak_mult = 1.0 + (streak_days as f32 * 0.05).min(1.0);

        // Award XP
        let base_xp = minutes * 10;
        let total_xp = (base_xp as f32 * streak_mult) as u32;
        self.add_xp(total_xp);

        total_xp
    }

    /// Log song completion
    #[wasm_bindgen]
    pub fn log_song_complete(&mut self, accuracy: u8) -> u32 {
        self.songs_completed += 1;

        // XP based on accuracy (25 base + up to 25 bonus)
        let bonus = (accuracy as u32 * 25) / 100;
        let xp = 25 + bonus;
        self.add_xp(xp);

        xp
    }

    /// Log game score
    #[wasm_bindgen]
    pub fn log_game_score(&mut self, game_id: &str, score: u32) -> u32 {
        self.games_played += 1;

        // Check if this is a new high score
        let is_high_score = match self.game_scores.get(game_id) {
            Some(&prev_score) => score > prev_score,
            None => true,
        };

        if is_high_score {
            self.game_scores.insert(game_id.to_string(), score);
        }

        // Award XP (10 base + bonus for high scores)
        let xp = if is_high_score { 10 + score / 10 } else { 10 };
        self.add_xp(xp);

        xp
    }

    // Getters
    #[wasm_bindgen(getter)]
    pub fn xp(&self) -> u32 { self.xp }

    #[wasm_bindgen(getter)]
    pub fn level(&self) -> u8 { self.level }

    #[wasm_bindgen(getter)]
    pub fn streak(&self) -> u32 { self.streak }

    #[wasm_bindgen(getter)]
    pub fn total_minutes(&self) -> u32 { self.total_minutes }

    #[wasm_bindgen(getter)]
    pub fn songs_completed(&self) -> u32 { self.songs_completed }

    #[wasm_bindgen(getter)]
    pub fn games_played(&self) -> u32 { self.games_played }
}

// ============================================================================
// Achievement System
// ============================================================================

/// Achievement definition
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Achievement {
    id: String,
    name: String,
    description: String,
    icon: String,
    unlocked: bool,
    unlock_date: Option<u64>,
}

#[wasm_bindgen]
impl Achievement {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String { self.id.clone() }

    #[wasm_bindgen(getter)]
    pub fn name(&self) -> String { self.name.clone() }

    #[wasm_bindgen(getter)]
    pub fn description(&self) -> String { self.description.clone() }

    #[wasm_bindgen(getter)]
    pub fn icon(&self) -> String { self.icon.clone() }

    #[wasm_bindgen(getter)]
    pub fn unlocked(&self) -> bool { self.unlocked }
}

/// Achievement tracker
#[wasm_bindgen]
pub struct AchievementTracker {
    achievements: Vec<Achievement>,
}

#[wasm_bindgen]
impl AchievementTracker {
    #[wasm_bindgen(constructor)]
    pub fn new() -> AchievementTracker {
        let achievements = vec![
            Achievement {
                id: "first_note".to_string(),
                name: "First Note!".to_string(),
                description: "Play your first note".to_string(),
                icon: "🎵".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "pitch_perfect".to_string(),
                name: "Pitch Perfect".to_string(),
                description: "Get 100% accuracy in Pitch Quest".to_string(),
                icon: "🎯".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "rhythm_master".to_string(),
                name: "Rhythm Master".to_string(),
                description: "Get a 50x combo in Rhythm Dash".to_string(),
                icon: "🥁".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "streak_7".to_string(),
                name: "Week Warrior".to_string(),
                description: "Practice for 7 days in a row".to_string(),
                icon: "🔥".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "streak_30".to_string(),
                name: "Monthly Master".to_string(),
                description: "Practice for 30 days in a row".to_string(),
                icon: "🏆".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "level_5".to_string(),
                name: "Rising Star".to_string(),
                description: "Reach Level 5".to_string(),
                icon: "⭐".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "level_10".to_string(),
                name: "Concert Ready".to_string(),
                description: "Reach Level 10".to_string(),
                icon: "🌟".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "songs_10".to_string(),
                name: "Repertoire Builder".to_string(),
                description: "Complete 10 different songs".to_string(),
                icon: "📚".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "bow_hero".to_string(),
                name: "Bow Control Master".to_string(),
                description: "Get 5 stars in Bow Hero".to_string(),
                icon: "🎻".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "ear_training".to_string(),
                name: "Golden Ear".to_string(),
                description: "100% accuracy in Ear Trainer advanced mode".to_string(),
                icon: "👂".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "practice_100".to_string(),
                name: "Dedicated Musician".to_string(),
                description: "Practice for 100 total minutes".to_string(),
                icon: "⏰".to_string(),
                unlocked: false,
                unlock_date: None,
            },
            Achievement {
                id: "all_games".to_string(),
                name: "Game Champion".to_string(),
                description: "Play all 9 games at least once".to_string(),
                icon: "🎮".to_string(),
                unlocked: false,
                unlock_date: None,
            },
        ];

        AchievementTracker { achievements }
    }

    /// Check and unlock achievement by ID
    #[wasm_bindgen]
    pub fn unlock(&mut self, id: &str, timestamp: u64) -> bool {
        for achievement in &mut self.achievements {
            if achievement.id == id && !achievement.unlocked {
                achievement.unlocked = true;
                achievement.unlock_date = Some(timestamp);
                return true;
            }
        }
        false
    }

    /// Check progress-based achievements
    #[wasm_bindgen]
    pub fn check_progress(&mut self, progress: &PlayerProgress, timestamp: u64) -> Vec<String> {
        let mut newly_unlocked = Vec::new();

        // Check level achievements
        if progress.level >= 5 && self.unlock("level_5", timestamp) {
            newly_unlocked.push("level_5".to_string());
        }
        if progress.level >= 10 && self.unlock("level_10", timestamp) {
            newly_unlocked.push("level_10".to_string());
        }

        // Check streak achievements
        if progress.streak >= 7 && self.unlock("streak_7", timestamp) {
            newly_unlocked.push("streak_7".to_string());
        }
        if progress.streak >= 30 && self.unlock("streak_30", timestamp) {
            newly_unlocked.push("streak_30".to_string());
        }

        // Check practice time achievements
        if progress.total_minutes >= 100 && self.unlock("practice_100", timestamp) {
            newly_unlocked.push("practice_100".to_string());
        }

        // Check songs completed
        if progress.songs_completed >= 10 && self.unlock("songs_10", timestamp) {
            newly_unlocked.push("songs_10".to_string());
        }

        newly_unlocked
    }

    /// Get count of unlocked achievements
    #[wasm_bindgen]
    pub fn unlocked_count(&self) -> usize {
        self.achievements.iter().filter(|a| a.unlocked).count()
    }

    /// Get total achievements count
    #[wasm_bindgen]
    pub fn total_count(&self) -> usize {
        self.achievements.len()
    }

    /// Check if a specific achievement is unlocked
    #[wasm_bindgen]
    pub fn is_unlocked(&self, id: &str) -> bool {
        self.achievements.iter().any(|a| a.id == id && a.unlocked)
    }
}

// ============================================================================
// Skill Profile (k-means inspired)
// ============================================================================

/// Skill categories for violin playing
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SkillCategory {
    Pitch,
    Rhythm,
    BowControl,
    Posture,
    Reading,
}

/// Skill profile with ratings per category
#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SkillProfile {
    pitch: f32,
    rhythm: f32,
    bow_control: f32,
    posture: f32,
    reading: f32,
    /// Sample count for averaging
    sample_count: u32,
}

#[wasm_bindgen]
impl SkillProfile {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SkillProfile {
        SkillProfile {
            pitch: 50.0,
            rhythm: 50.0,
            bow_control: 50.0,
            posture: 50.0,
            reading: 50.0,
            sample_count: 0,
        }
    }

    /// Update a skill score with exponential moving average
    pub fn update_skill(&mut self, category: SkillCategory, score: f32) {
        let alpha = 0.2; // Smoothing factor
        let skill = match category {
            SkillCategory::Pitch => &mut self.pitch,
            SkillCategory::Rhythm => &mut self.rhythm,
            SkillCategory::BowControl => &mut self.bow_control,
            SkillCategory::Posture => &mut self.posture,
            SkillCategory::Reading => &mut self.reading,
        };

        *skill = alpha * score + (1.0 - alpha) * *skill;
        self.sample_count += 1;
    }

    /// Update pitch skill
    #[wasm_bindgen]
    pub fn update_pitch(&mut self, score: f32) {
        self.update_skill(SkillCategory::Pitch, score);
    }

    /// Update rhythm skill
    #[wasm_bindgen]
    pub fn update_rhythm(&mut self, score: f32) {
        self.update_skill(SkillCategory::Rhythm, score);
    }

    /// Update bow control skill
    #[wasm_bindgen]
    pub fn update_bow_control(&mut self, score: f32) {
        self.update_skill(SkillCategory::BowControl, score);
    }

    /// Update posture skill
    #[wasm_bindgen]
    pub fn update_posture(&mut self, score: f32) {
        self.update_skill(SkillCategory::Posture, score);
    }

    /// Update reading skill
    #[wasm_bindgen]
    pub fn update_reading(&mut self, score: f32) {
        self.update_skill(SkillCategory::Reading, score);
    }

    fn clamp_score(score: f32) -> f32 {
        score.max(0.0).min(100.0)
    }

    fn score_from_minutes(minutes: u32, base: f32, step: f32) -> f32 {
        let score = base + (minutes as f32 * step);
        SkillProfile::clamp_score(score)
    }

    fn update_all_skills(&mut self, score: f32) {
        self.update_skill(SkillCategory::Pitch, score);
        self.update_skill(SkillCategory::Rhythm, score);
        self.update_skill(SkillCategory::BowControl, score);
        self.update_skill(SkillCategory::Posture, score);
        self.update_skill(SkillCategory::Reading, score);
    }

    /// Apply practice events using the JS-aligned ruleset.
    #[wasm_bindgen]
    pub fn apply_practice_event(&mut self, event_id: &str, minutes: u32) {
        if event_id.is_empty() {
            return;
        }

        let is_goal = event_id.starts_with("goal-step-")
            || event_id.starts_with("parent-goal-")
            || event_id.starts_with("goal-warmup")
            || event_id.starts_with("goal-scale")
            || event_id.starts_with("goal-song")
            || event_id.starts_with("goal-rhythm")
            || event_id.starts_with("goal-ear");

        if is_goal {
            let score = SkillProfile::score_from_minutes(minutes, 52.0, 6.0);
            self.update_all_skills(score);
            return;
        }

        let weighted_base = SkillProfile::score_from_minutes(minutes, 58.0, 9.0);

        if event_id.starts_with("pq-step-") {
            self.update_skill(SkillCategory::Pitch, SkillProfile::clamp_score(weighted_base * 1.0));
            return;
        }
        if event_id.starts_with("et-step-") {
            self.update_skill(SkillCategory::Pitch, SkillProfile::clamp_score(weighted_base * 0.85));
            return;
        }
        if event_id.starts_with("rd-set-") {
            self.update_skill(SkillCategory::Rhythm, SkillProfile::clamp_score(weighted_base * 1.0));
            return;
        }
        if event_id.starts_with("rp-pattern-") {
            self.update_skill(SkillCategory::Rhythm, SkillProfile::clamp_score(weighted_base * 0.8));
            return;
        }
        if event_id.starts_with("pz-step-") {
            self.update_skill(SkillCategory::Rhythm, SkillProfile::clamp_score(weighted_base * 0.75));
            return;
        }
        if event_id.starts_with("bh-step-") {
            self.update_skill(SkillCategory::BowControl, SkillProfile::clamp_score(weighted_base * 1.0));
            return;
        }
        if event_id.starts_with("bow-set-") {
            self.update_skill(SkillCategory::BowControl, SkillProfile::clamp_score(weighted_base * 0.9));
            return;
        }
        if event_id.starts_with("sq-step-") {
            self.update_skill(SkillCategory::BowControl, SkillProfile::clamp_score(weighted_base * 0.85));
            return;
        }
        if event_id.starts_with("tt-step-") {
            self.update_skill(SkillCategory::Pitch, SkillProfile::clamp_score(weighted_base * 0.9));
            return;
        }
        if event_id.starts_with("sp-step-") {
            self.update_skill(SkillCategory::Pitch, SkillProfile::clamp_score(weighted_base * 0.95));
            return;
        }
        if event_id.starts_with("ss-step-") {
            self.update_skill(SkillCategory::Reading, SkillProfile::clamp_score(weighted_base * 0.8));
            return;
        }
        if event_id.starts_with("nm-card-") {
            self.update_skill(SkillCategory::Reading, SkillProfile::clamp_score(weighted_base * 0.7));
            return;
        }
        if event_id.starts_with("mm-step-") {
            self.update_skill(SkillCategory::Reading, SkillProfile::clamp_score(weighted_base * 0.75));
            return;
        }
        if event_id.starts_with("dc-step-") {
            self.update_skill(SkillCategory::Rhythm, SkillProfile::clamp_score(weighted_base * 0.9));
            return;
        }

        let score = SkillProfile::score_from_minutes(minutes, 50.0, 4.0);
        self.update_all_skills(score);
    }

    /// Get the weakest skill category for focus
    #[wasm_bindgen]
    pub fn weakest_skill(&self) -> String {
        let skills = [
            (self.pitch, "pitch"),
            (self.rhythm, "rhythm"),
            (self.bow_control, "bow_control"),
            (self.posture, "posture"),
            (self.reading, "reading"),
        ];

        skills
            .iter()
            .min_by(|a, b| a.0.partial_cmp(&b.0).unwrap())
            .map(|(_, name)| name.to_string())
            .unwrap_or_else(|| "pitch".to_string())
    }

    /// Get overall skill level (average)
    #[wasm_bindgen]
    pub fn overall(&self) -> f32 {
        (self.pitch + self.rhythm + self.bow_control + self.posture + self.reading) / 5.0
    }

    // Getters
    #[wasm_bindgen(getter)]
    pub fn pitch(&self) -> f32 { self.pitch }

    #[wasm_bindgen(getter)]
    pub fn rhythm(&self) -> f32 { self.rhythm }

    #[wasm_bindgen(getter)]
    pub fn bow_control(&self) -> f32 { self.bow_control }

    #[wasm_bindgen(getter)]
    pub fn posture(&self) -> f32 { self.posture }

    #[wasm_bindgen(getter)]
    pub fn reading(&self) -> f32 { self.reading }
}

// ============================================================================
// Game Timing Engine
// ============================================================================

/// High-precision game timing for rhythm games
#[wasm_bindgen]
pub struct GameTimer {
    /// BPM (beats per minute)
    bpm: f32,
    /// Milliseconds per beat
    ms_per_beat: f32,
    /// Start timestamp
    start_time: f64,
    /// Current beat number
    current_beat: u32,
    /// Tolerance for "perfect" timing (ms)
    perfect_window: f32,
    /// Tolerance for "good" timing (ms)
    good_window: f32,
}

#[wasm_bindgen]
impl GameTimer {
    #[wasm_bindgen(constructor)]
    pub fn new(bpm: f32) -> GameTimer {
        let ms_per_beat = 60000.0 / bpm;
        GameTimer {
            bpm,
            ms_per_beat,
            start_time: 0.0,
            current_beat: 0,
            perfect_window: 50.0,  // ±50ms for perfect
            good_window: 100.0,    // ±100ms for good
        }
    }

    /// Start the timer
    #[wasm_bindgen]
    pub fn start(&mut self, timestamp: f64) {
        self.start_time = timestamp;
        self.current_beat = 0;
    }

    /// Get current beat position
    #[wasm_bindgen]
    pub fn get_beat(&self, timestamp: f64) -> f32 {
        let elapsed = timestamp - self.start_time;
        (elapsed / self.ms_per_beat as f64) as f32
    }

    /// Score a tap at the given timestamp
    /// Returns: 0 = miss, 1 = good, 2 = perfect
    #[wasm_bindgen]
    pub fn score_tap(&self, timestamp: f64, target_beat: u32) -> u8 {
        let target_time = self.start_time + (target_beat as f64 * self.ms_per_beat as f64);
        let diff = (timestamp - target_time).abs() as f32;

        if diff <= self.perfect_window {
            2 // Perfect
        } else if diff <= self.good_window {
            1 // Good
        } else {
            0 // Miss
        }
    }

    /// Set BPM (updates ms_per_beat)
    #[wasm_bindgen]
    pub fn set_bpm(&mut self, bpm: f32) {
        self.bpm = bpm;
        self.ms_per_beat = 60000.0 / bpm;
    }

    #[wasm_bindgen(getter)]
    pub fn bpm(&self) -> f32 { self.bpm }

    #[wasm_bindgen(getter)]
    pub fn ms_per_beat(&self) -> f32 { self.ms_per_beat }
}

// ============================================================================
// Practice Streak Calculator
// ============================================================================

/// Calculate streak from practice dates
#[wasm_bindgen]
pub fn calculate_streak(practice_dates: &[u32]) -> u32 {
    if practice_dates.is_empty() {
        return 0;
    }

    // Sort dates (assuming they're Unix days)
    let mut sorted: Vec<u32> = practice_dates.to_vec();
    sorted.sort_unstable();
    sorted.dedup();

    // Count consecutive days from most recent
    let mut streak = 1;
    for i in (0..sorted.len() - 1).rev() {
        if sorted[i + 1] - sorted[i] == 1 {
            streak += 1;
        } else {
            break;
        }
    }

    streak
}

/// Calculate adaptive difficulty based on recent scores
#[wasm_bindgen]
pub fn calculate_difficulty(recent_scores: &[u8]) -> u8 {
    if recent_scores.is_empty() {
        return 50; // Medium difficulty
    }

    let avg: f32 = recent_scores.iter().map(|&s| s as f32).sum::<f32>() / recent_scores.len() as f32;

    // If averaging above 85%, increase difficulty
    // If averaging below 60%, decrease difficulty
    if avg >= 85.0 {
        (avg as u8).min(100)
    } else if avg < 60.0 {
        (avg as u8).max(20)
    } else {
        avg as u8
    }
}

// ============================================================================
// Recommendation Seed (WASM-friendly summary for JS lesson planning)
// ============================================================================

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkillSample {
    skill: String,
    score: f32,
    timestamp: Option<f64>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SongSample {
    accuracy: f32,
    timestamp: Option<f64>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecommendationSeed {
    weakest_skill: String,
    song_level: String,
    skill_scores: HashMap<String, f32>,
    average_song: f32,
}

fn clamp_score(value: f32) -> f32 {
    if value.is_finite() {
        value.max(0.0).min(100.0)
    } else {
        0.0
    }
}

fn recency_weight(timestamp: Option<f64>, now_ms: f64) -> f32 {
    let ts = match timestamp {
        Some(value) if value.is_finite() => value,
        _ => return 1.0,
    };
    let delta = (now_ms - ts).max(0.0);
    let days = delta / 86_400_000.0;
    (1.0 / (1.0 + (days * 0.35))) as f32
}

#[wasm_bindgen]
pub fn compute_recommendation_seed(adaptive_log: JsValue, song_events: JsValue) -> Result<JsValue, JsValue> {
    let samples: Vec<SkillSample> = serde_wasm_bindgen::from_value(adaptive_log)
        .map_err(|err| JsValue::from_str(&format!("Invalid adaptive log: {err}")))?;
    let songs: Vec<SongSample> = serde_wasm_bindgen::from_value(song_events)
        .map_err(|err| JsValue::from_str(&format!("Invalid song events: {err}")))?;

    let now_ms = Date::now();
    let candidates = ["pitch", "rhythm", "bow_control", "reading", "posture"];
    let mut totals: HashMap<String, f32> = HashMap::new();
    let mut counts: HashMap<String, f32> = HashMap::new();

    for sample in samples {
        if !candidates.contains(&sample.skill.as_str()) {
            continue;
        }
        let score = clamp_score(sample.score);
        let weight = recency_weight(sample.timestamp, now_ms);
        if weight <= 0.0 {
            continue;
        }
        *totals.entry(sample.skill.clone()).or_insert(0.0) += score * weight;
        *counts.entry(sample.skill.clone()).or_insert(0.0) += weight;
    }

    let mut skill_scores: HashMap<String, f32> = HashMap::new();
    for &skill in &candidates {
        let total = totals.get(skill).copied().unwrap_or(0.0);
        let count = counts.get(skill).copied().unwrap_or(0.0);
        let score = if count > 0.0 { total / count } else { 60.0 };
        skill_scores.insert(skill.to_string(), clamp_score(score));
    }

    let weakest_skill = candidates
        .iter()
        .map(|skill| {
            let score = skill_scores.get(*skill).copied().unwrap_or(60.0);
            (*skill, score)
        })
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(skill, _)| skill.to_string())
        .unwrap_or_else(|| "pitch".to_string());

    let mut weighted_total = 0.0;
    let mut weighted_count = 0.0;
    let mut raw_total = 0.0;
    for song in songs.iter() {
        let accuracy = clamp_score(song.accuracy);
        raw_total += accuracy;
        let weight = recency_weight(song.timestamp, now_ms);
        weighted_total += accuracy * weight;
        weighted_count += weight;
    }
    let average_song = if weighted_count > 0.0 {
        weighted_total / weighted_count
    } else if !songs.is_empty() {
        raw_total / songs.len() as f32
    } else {
        0.0
    };

    let song_level = if average_song >= 85.0 {
        "advanced"
    } else if average_song >= 65.0 {
        "intermediate"
    } else {
        "beginner"
    };

    let seed = RecommendationSeed {
        weakest_skill,
        song_level: song_level.to_string(),
        skill_scores,
        average_song: clamp_score(average_song),
    };

    serde_wasm_bindgen::to_value(&seed)
        .map_err(|err| JsValue::from_str(&format!("Serialize seed failed: {err}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_level_calculation() {
        let mut progress = PlayerProgress::new();
        assert_eq!(progress.level, 1);

        progress.add_xp(100);
        assert_eq!(progress.level, 2);

        progress.add_xp(150);
        assert_eq!(progress.level, 3);
    }

    #[test]
    fn test_streak_calculation() {
        let dates = vec![100, 101, 102, 103, 105]; // Gap at 104
        assert_eq!(calculate_streak(&dates), 1); // Only day 105

        let consecutive = vec![100, 101, 102, 103, 104];
        assert_eq!(calculate_streak(&consecutive), 5);
    }
}
