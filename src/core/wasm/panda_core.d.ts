/* tslint:disable */
/* eslint-disable */

/**
 * Achievement definition
 */
export class Achievement {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly description: string;
    readonly icon: string;
    readonly id: string;
    readonly name: string;
    readonly unlocked: boolean;
}

/**
 * Achievement tracker
 */
export class AchievementTracker {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Check progress-based achievements
     */
    check_progress(progress: PlayerProgress, timestamp: bigint): string[];
    /**
     * Check if a specific achievement is unlocked
     */
    is_unlocked(id: string): boolean;
    constructor();
    /**
     * Get total achievements count
     */
    total_count(): number;
    /**
     * Check and unlock achievement by ID
     */
    unlock(id: string, timestamp: bigint): boolean;
    /**
     * Get count of unlocked achievements
     */
    unlocked_count(): number;
}

/**
 * High-precision game timing for rhythm games
 */
export class GameTimer {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Get current beat position
     */
    get_beat(timestamp: number): number;
    constructor(bpm: number);
    /**
     * Score a tap at the given timestamp
     * Returns: 0 = miss, 1 = good, 2 = perfect
     */
    score_tap(timestamp: number, target_beat: number): number;
    /**
     * Set BPM (updates ms_per_beat)
     */
    set_bpm(bpm: number): void;
    /**
     * Start the timer
     */
    start(timestamp: number): void;
    readonly bpm: number;
    readonly ms_per_beat: number;
}

/**
 * Player progress state
 */
export class PlayerProgress {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add XP and check for level up
     */
    add_xp(amount: number): boolean;
    /**
     * Get progress percentage to next level (0-100)
     */
    level_progress(): number;
    /**
     * Log game score
     */
    log_game_score(game_id: string, score: number): number;
    /**
     * Log practice time and award XP
     */
    log_practice(minutes: number, streak_days: number): number;
    /**
     * Log song completion
     */
    log_song_complete(accuracy: number): number;
    constructor();
    /**
     * Get XP needed for next level
     */
    xp_to_next_level(): number;
    readonly games_played: number;
    readonly level: number;
    readonly songs_completed: number;
    readonly streak: number;
    readonly total_minutes: number;
    readonly xp: number;
}

/**
 * Skill categories for violin playing
 */
export enum SkillCategory {
    Pitch = 0,
    Rhythm = 1,
    BowControl = 2,
    Posture = 3,
    Reading = 4,
}

/**
 * Skill profile with ratings per category
 */
export class SkillProfile {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Apply practice events using the JS-aligned ruleset.
     */
    apply_practice_event(event_id: string, minutes: number): void;
    constructor();
    /**
     * Get overall skill level (average)
     */
    overall(): number;
    /**
     * Update bow control skill
     */
    update_bow_control(score: number): void;
    /**
     * Update pitch skill
     */
    update_pitch(score: number): void;
    /**
     * Update posture skill
     */
    update_posture(score: number): void;
    /**
     * Update reading skill
     */
    update_reading(score: number): void;
    /**
     * Update rhythm skill
     */
    update_rhythm(score: number): void;
    /**
     * Update a skill score with exponential moving average
     */
    update_skill(category: SkillCategory, score: number): void;
    /**
     * Get the weakest skill category for focus
     */
    weakest_skill(): string;
    readonly bow_control: number;
    readonly pitch: number;
    readonly posture: number;
    readonly reading: number;
    readonly rhythm: number;
}

/**
 * XP reward multipliers
 */
export class XpRewards {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Bonus for perfect score in a game
     */
    game_perfect: number;
    /**
     * Base XP per minute of practice
     */
    per_minute: number;
    /**
     * Bonus for completing a song
     */
    song_complete: number;
    /**
     * Multiplier for streak days
     */
    streak_multiplier: number;
}

/**
 * Calculate adaptive difficulty based on recent scores
 */
export function calculate_difficulty(recent_scores: Uint8Array): number;

/**
 * Calculate streak from practice dates
 */
export function calculate_streak(practice_dates: Uint32Array): number;

export function compute_recommendation_seed(adaptive_log: any, song_events: any): any;

export function init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_achievement_free: (a: number, b: number) => void;
    readonly __wbg_achievementtracker_free: (a: number, b: number) => void;
    readonly __wbg_gametimer_free: (a: number, b: number) => void;
    readonly __wbg_get_xprewards_game_perfect: (a: number) => number;
    readonly __wbg_get_xprewards_per_minute: (a: number) => number;
    readonly __wbg_get_xprewards_song_complete: (a: number) => number;
    readonly __wbg_get_xprewards_streak_multiplier: (a: number) => number;
    readonly __wbg_playerprogress_free: (a: number, b: number) => void;
    readonly __wbg_set_xprewards_game_perfect: (a: number, b: number) => void;
    readonly __wbg_set_xprewards_per_minute: (a: number, b: number) => void;
    readonly __wbg_set_xprewards_song_complete: (a: number, b: number) => void;
    readonly __wbg_set_xprewards_streak_multiplier: (a: number, b: number) => void;
    readonly __wbg_skillprofile_free: (a: number, b: number) => void;
    readonly __wbg_xprewards_free: (a: number, b: number) => void;
    readonly achievement_description: (a: number) => [number, number];
    readonly achievement_icon: (a: number) => [number, number];
    readonly achievement_id: (a: number) => [number, number];
    readonly achievement_name: (a: number) => [number, number];
    readonly achievement_unlocked: (a: number) => number;
    readonly achievementtracker_check_progress: (a: number, b: number, c: bigint) => [number, number];
    readonly achievementtracker_is_unlocked: (a: number, b: number, c: number) => number;
    readonly achievementtracker_new: () => number;
    readonly achievementtracker_total_count: (a: number) => number;
    readonly achievementtracker_unlock: (a: number, b: number, c: number, d: bigint) => number;
    readonly achievementtracker_unlocked_count: (a: number) => number;
    readonly calculate_difficulty: (a: number, b: number) => number;
    readonly calculate_streak: (a: number, b: number) => number;
    readonly compute_recommendation_seed: (a: any, b: any) => [number, number, number];
    readonly gametimer_bpm: (a: number) => number;
    readonly gametimer_get_beat: (a: number, b: number) => number;
    readonly gametimer_ms_per_beat: (a: number) => number;
    readonly gametimer_new: (a: number) => number;
    readonly gametimer_score_tap: (a: number, b: number, c: number) => number;
    readonly gametimer_set_bpm: (a: number, b: number) => void;
    readonly gametimer_start: (a: number, b: number) => void;
    readonly playerprogress_add_xp: (a: number, b: number) => number;
    readonly playerprogress_games_played: (a: number) => number;
    readonly playerprogress_level: (a: number) => number;
    readonly playerprogress_level_progress: (a: number) => number;
    readonly playerprogress_log_game_score: (a: number, b: number, c: number, d: number) => number;
    readonly playerprogress_log_practice: (a: number, b: number, c: number) => number;
    readonly playerprogress_log_song_complete: (a: number, b: number) => number;
    readonly playerprogress_new: () => number;
    readonly playerprogress_songs_completed: (a: number) => number;
    readonly playerprogress_streak: (a: number) => number;
    readonly playerprogress_total_minutes: (a: number) => number;
    readonly playerprogress_xp: (a: number) => number;
    readonly playerprogress_xp_to_next_level: (a: number) => number;
    readonly skillprofile_apply_practice_event: (a: number, b: number, c: number, d: number) => void;
    readonly skillprofile_bow_control: (a: number) => number;
    readonly skillprofile_new: () => number;
    readonly skillprofile_overall: (a: number) => number;
    readonly skillprofile_pitch: (a: number) => number;
    readonly skillprofile_posture: (a: number) => number;
    readonly skillprofile_rhythm: (a: number) => number;
    readonly skillprofile_update_bow_control: (a: number, b: number) => void;
    readonly skillprofile_update_pitch: (a: number, b: number) => void;
    readonly skillprofile_update_posture: (a: number, b: number) => void;
    readonly skillprofile_update_reading: (a: number, b: number) => void;
    readonly skillprofile_update_rhythm: (a: number, b: number) => void;
    readonly skillprofile_update_skill: (a: number, b: number, c: number) => void;
    readonly skillprofile_weakest_skill: (a: number) => [number, number];
    readonly init: () => void;
    readonly skillprofile_reading: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
