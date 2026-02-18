//! Panda Core - Business Logic Engine
use wasm_bindgen::prelude::*;

mod xp;
mod achievements;
mod skills;

pub use xp::{XpRewards, PlayerProgress};
pub use achievements::{Achievement, AchievementTracker};
pub use skills::{SkillCategory, SkillProfile, calculate_streak};

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}
