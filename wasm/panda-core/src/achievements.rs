use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::xp::PlayerProgress;

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
