import { createSkillProfileUtils } from '../utils/skill-profile.js';
import { buildPrimaryProgressModel as buildFallbackPrimaryProgressModel } from './progress-model-primary.js';
import {
    composeProgressWithSupplemental as composeFallbackProgressWithSupplemental,
} from './progress-model-result.js';

// Keep fallback behavior aligned with wasm/panda-core/src/xp.rs.
const LEVEL_XP = Object.freeze([
    0, 100, 250, 500, 850, 1300, 1900, 2650, 3550, 4600,
    5850, 7300, 8950, 10800, 12900, 15250, 17900, 20850, 24100, 27700,
]);

const ACHIEVEMENT_IDS = Object.freeze([
    'first_note',
    'pitch_perfect',
    'rhythm_master',
    'streak_7',
    'streak_30',
    'level_5',
    'level_10',
    'songs_10',
    'bow_hero',
    'ear_training',
    'practice_100',
    'all_games',
]);

const clampRounded = (value, min = 0, max = 100) => {
    const numeric = Number.isFinite(value) ? Math.round(value) : 0;
    return Math.max(min, Math.min(max, numeric));
};

class FallbackPlayerProgress {
    constructor() {
        this._xp = 0;
        this._level = 1;
        this._streak = 0;
        this._totalMinutes = 0;
        this._songsCompleted = 0;
        this._gamesPlayed = 0;
        this._gameScores = new Map();
    }

    _addXp(amount) {
        this._xp += Math.max(0, Math.round(amount) || 0);
        this._checkLevelUp();
    }

    _checkLevelUp() {
        const level = this._calculateLevel();
        if (level > this._level) this._level = level;
    }

    _calculateLevel() {
        for (let i = LEVEL_XP.length - 1; i >= 0; i -= 1) {
            if (this._xp >= LEVEL_XP[i]) return i + 1;
        }
        return 1;
    }

    get xp() {
        return this._xp;
    }

    get level() {
        return this._level;
    }

    get streak() {
        return this._streak;
    }

    get total_minutes() {
        return this._totalMinutes;
    }

    get songs_completed() {
        return this._songsCompleted;
    }

    xp_to_next_level() {
        if (this._level >= LEVEL_XP.length) return 0;
        const nextLevelXp = LEVEL_XP[this._level];
        return this._xp >= nextLevelXp ? 0 : (nextLevelXp - this._xp);
    }

    level_progress() {
        if (this._level >= LEVEL_XP.length) return 100;
        const currentLevelXp = LEVEL_XP[this._level - 1];
        const nextLevelXp = LEVEL_XP[this._level];
        const range = Math.max(1, nextLevelXp - currentLevelXp);
        const progressed = this._xp - currentLevelXp;
        return Math.min(100, Math.round((progressed / range) * 100));
    }

    log_practice(minutes, streakDays) {
        const safeMinutes = Math.max(0, Math.round(minutes) || 0);
        const safeStreak = Math.max(0, Math.round(streakDays) || 0);
        this._totalMinutes += safeMinutes;
        this._streak = safeStreak;

        const streakMult = 1 + Math.min(1, safeStreak * 0.05);
        const baseXp = safeMinutes * 10;
        const totalXp = Math.round(baseXp * streakMult);
        this._addXp(totalXp);
        return totalXp;
    }

    log_song_complete(accuracy) {
        const safeAccuracy = clampRounded(accuracy, 0, 100);
        this._songsCompleted += 1;
        const bonus = Math.floor((safeAccuracy * 25) / 100);
        const xp = 25 + bonus;
        this._addXp(xp);
        return xp;
    }

    log_game_score(gameId, score) {
        const id = typeof gameId === 'string' && gameId.trim() ? gameId.trim() : 'game';
        const safeScore = Math.max(0, Math.round(score) || 0);
        this._gamesPlayed += 1;

        const previous = this._gameScores.get(id);
        const isHighScore = !Number.isFinite(previous) || safeScore > previous;
        if (isHighScore) this._gameScores.set(id, safeScore);

        const xp = isHighScore ? 10 + Math.floor(safeScore / 10) : 10;
        this._addXp(xp);
        return xp;
    }
}

class FallbackAchievementTracker {
    constructor() {
        this._achievements = new Map(ACHIEVEMENT_IDS.map((id) => [id, false]));
    }

    unlock(id, _timestamp) {
        if (!this._achievements.has(id)) return false;
        if (this._achievements.get(id)) return false;
        this._achievements.set(id, true);
        return true;
    }

    check_progress(progress, timestamp) {
        const newlyUnlocked = [];

        if (progress.level >= 5 && this.unlock('level_5', timestamp)) {
            newlyUnlocked.push('level_5');
        }
        if (progress.level >= 10 && this.unlock('level_10', timestamp)) {
            newlyUnlocked.push('level_10');
        }
        if (progress.streak >= 7 && this.unlock('streak_7', timestamp)) {
            newlyUnlocked.push('streak_7');
        }
        if (progress.streak >= 30 && this.unlock('streak_30', timestamp)) {
            newlyUnlocked.push('streak_30');
        }
        if (progress.total_minutes >= 100 && this.unlock('practice_100', timestamp)) {
            newlyUnlocked.push('practice_100');
        }
        if (progress.songs_completed >= 10 && this.unlock('songs_10', timestamp)) {
            newlyUnlocked.push('songs_10');
        }

        return newlyUnlocked;
    }

    is_unlocked(id) {
        return this._achievements.get(id) === true;
    }
}

const SkillCategory = Object.freeze({
    Pitch: 'Pitch',
    Rhythm: 'Rhythm',
    BowControl: 'BowControl',
    Posture: 'Posture',
    Reading: 'Reading',
});

class FallbackSkillProfile {
    constructor() {
        this._pitch = 50;
        this._rhythm = 50;
        this._bowControl = 50;
        this._posture = 50;
        this._reading = 50;
    }

    update_skill(category, score) {
        const alpha = 0.2;
        const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
        const next = (current) => (alpha * safeScore) + ((1 - alpha) * current);

        switch (category) {
            case SkillCategory.Pitch:
                this._pitch = next(this._pitch);
                break;
            case SkillCategory.Rhythm:
                this._rhythm = next(this._rhythm);
                break;
            case SkillCategory.BowControl:
                this._bowControl = next(this._bowControl);
                break;
            case SkillCategory.Posture:
                this._posture = next(this._posture);
                break;
            case SkillCategory.Reading:
                this._reading = next(this._reading);
                break;
            default:
                break;
        }
    }

    weakest_skill() {
        const skills = [
            [this._pitch, 'pitch'],
            [this._rhythm, 'rhythm'],
            [this._bowControl, 'bow_control'],
            [this._posture, 'posture'],
            [this._reading, 'reading'],
        ];
        skills.sort((left, right) => left[0] - right[0]);
        return skills[0]?.[1] || 'pitch';
    }

    get pitch() {
        return this._pitch;
    }

    get rhythm() {
        return this._rhythm;
    }

    get bow_control() {
        return this._bowControl;
    }

    get posture() {
        return this._posture;
    }

    get reading() {
        return this._reading;
    }
}

const calculateStreak = (practiceDates) => {
    const values = Array.from(practiceDates || [])
        .map((value) => Number(value))
        .filter(Number.isFinite)
        .map((value) => Math.round(value));
    if (!values.length) return 0;

    const sorted = [...new Set(values)].sort((left, right) => left - right);
    let streak = 1;
    for (let i = sorted.length - 2; i >= 0; i -= 1) {
        if (sorted[i + 1] - sorted[i] === 1) {
            streak += 1;
        } else {
            break;
        }
    }
    return streak;
};

export const buildFallbackProgress = async (events, error) => {
    if (error) {
        console.warn('[progress] Falling back to JS shim model', error);
    }

    const { updateSkillProfile } = createSkillProfileUtils(SkillCategory);
    const primary = buildFallbackPrimaryProgressModel({
        events,
        PlayerProgress: FallbackPlayerProgress,
        AchievementTracker: FallbackAchievementTracker,
        SkillProfile: FallbackSkillProfile,
        SkillCategory,
        calculateStreak,
        updateSkillProfile,
    });
    return composeFallbackProgressWithSupplemental(primary);
};
