use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
    pub(crate) xp: u32,
    /// Current level
    pub(crate) level: u8,
    /// Current streak in days
    pub(crate) streak: u32,
    /// Total practice time in minutes
    pub(crate) total_minutes: u32,
    /// Songs completed count
    pub(crate) songs_completed: u32,
    /// Games played count
    pub(crate) games_played: u32,
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
}
