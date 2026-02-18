use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_streak_calculation() {
        let dates = vec![100, 101, 102, 103, 105]; // Gap at 104
        assert_eq!(calculate_streak(&dates), 1); // Only day 105

        let consecutive = vec![100, 101, 102, 103, 104];
        assert_eq!(calculate_streak(&consecutive), 5);
    }
}
