import { toTrackerTimestamp } from './progress-utils.js';
import { clamp, todayDay } from '../utils/math.js';
import {
    PRACTICE_GAME_RULES,
    buildProgressEventBuckets,
    createDailyMinutes,
    addMinutesToDailyWindow,
} from './progress-model-events.js';

const calculateStreakFromDays = (calculateStreak, uniqueDays) => calculateStreak(new Uint32Array(uniqueDays));

const trackPracticeEvents = ({ practiceEvents, progress, skillProfile, calculateStreak, updateSkillProfile, currentDay, dailyMinutes }) => {
    const uniqueDays = [];
    const seenDays = new Set();
    let totalMinutes = 0;
    let weekMinutes = 0;

    for (const event of practiceEvents) {
        if (!seenDays.has(event.day)) {
            seenDays.add(event.day);
            uniqueDays.push(event.day);
        }
        const streak = calculateStreakFromDays(calculateStreak, uniqueDays);
        progress.log_practice(event.minutes, streak);
        totalMinutes += event.minutes;
        updateSkillProfile(skillProfile, event.id, event.minutes);
        if (addMinutesToDailyWindow(dailyMinutes, currentDay, event.day, event.minutes)) {
            weekMinutes += event.minutes;
        }
    }

    return { uniqueDays, totalMinutes, weekMinutes };
};

const logGameEvents = (gameEvents, progress, skillProfile, SkillCategory) => {
    for (const event of gameEvents) {
        const score = Number.isFinite(event.score) ? Math.round(event.score) : 0;
        progress.log_game_score(event.id || 'game', Math.max(0, score));
        if (event.id !== 'rhythm-dash') continue;
        const accuracyScore = Number.isFinite(event.accuracy) ? event.accuracy : score;
        skillProfile.update_skill(SkillCategory.Rhythm, clamp(accuracyScore, 20, 100));
    }
};

const buildGameStats = (gameEvents) => {
    const stats = new Map();
    for (const event of gameEvents) {
        if (!event.id) continue;
        const entry = stats.get(event.id) || { bestScore: 0, bestStars: 0 };
        const scoreValue = Number.isFinite(event.accuracy) ? event.accuracy : event.score;
        if (Number.isFinite(scoreValue)) {
            entry.bestScore = Math.max(entry.bestScore, scoreValue);
        }
        if (Number.isFinite(event.stars)) {
            entry.bestStars = Math.max(entry.bestStars, event.stars);
        }
        stats.set(event.id, entry);
    }
    return stats;
};

const getGameStat = (gameStats, id, key) => gameStats.get(id)?.[key] || 0;

const unlockGameAchievements = (tracker, gameStats, timestamp) => {
    if (getGameStat(gameStats, 'pitch-quest', 'bestScore') >= 85) tracker.unlock('pitch_perfect', timestamp);
    if (getGameStat(gameStats, 'rhythm-dash', 'bestScore') >= 85) tracker.unlock('rhythm_master', timestamp);
    if (getGameStat(gameStats, 'ear-trainer', 'bestScore') >= 90) tracker.unlock('ear_training', timestamp);
    if (getGameStat(gameStats, 'bow-hero', 'bestScore') >= 85 || getGameStat(gameStats, 'bow-hero', 'bestStars') >= 5) {
        tracker.unlock('bow_hero', timestamp);
    }
};

const inferPracticeGameId = (practiceId) => {
    for (const rule of PRACTICE_GAME_RULES) {
        if (rule.test.test(practiceId)) {
            return rule.id;
        }
    }
    return null;
};

const collectPlayedGames = (gameEvents, practiceEvents) => {
    const playedGames = new Set(gameEvents.map((event) => event.id).filter(Boolean));
    for (const event of practiceEvents) {
        if (!event.id) continue;
        const inferredId = inferPracticeGameId(event.id);
        if (inferredId) playedGames.add(inferredId);
    }
    return playedGames;
};

const unlockProgressMilestones = ({ tracker, progress, totalMinutes, streak, playedGamesCount, practiceCount, timestamp }) => {
    if (playedGamesCount >= PRACTICE_GAME_RULES.length) tracker.unlock('all_games', timestamp);
    if (streak >= 7) tracker.unlock('streak_7', timestamp);
    if (progress.level >= 5) tracker.unlock('level_5', timestamp);
    if (totalMinutes >= 100) tracker.unlock('practice_100', timestamp);
    if (practiceCount > 0) tracker.unlock('first_note', timestamp);
};

const applySongEvents = ({ songEvents, progress, skillProfile, SkillCategory, currentDay, dailyMinutes }) => {
    let weekMinutes = 0;
    for (const event of songEvents) {
        const accuracy = Number.isFinite(event.accuracy) ? Math.round(event.accuracy) : 0;
        const tier = Number.isFinite(event.tier) ? Math.round(event.tier) : accuracy;
        progress.log_song_complete(clamp(tier, 0, 100));
        skillProfile.update_skill(SkillCategory.Reading, clamp(accuracy, 30, 100));
        skillProfile.update_skill(SkillCategory.Pitch, clamp(accuracy * 0.85, 25, 100));
        if (!Number.isFinite(event.duration)) continue;
        const minutes = Math.round(Number(event.duration) / 60);
        if (addMinutesToDailyWindow(dailyMinutes, currentDay, event.day, minutes)) {
            weekMinutes += minutes;
        }
    }
    return weekMinutes;
};

const applyRecordedAchievements = (events, tracker) => {
    events
        .filter((event) => event.type === 'achievement')
        .forEach((event) => {
            tracker.unlock(event.id, toTrackerTimestamp(event.timestamp));
        });
};

const snapshotSkills = (skillProfile) => ({
    pitch: skillProfile.pitch,
    rhythm: skillProfile.rhythm,
    bow_control: skillProfile.bow_control,
    posture: skillProfile.posture,
    reading: skillProfile.reading,
});

export const buildPrimaryProgressModel = ({
    events,
    PlayerProgress,
    AchievementTracker,
    SkillProfile,
    SkillCategory,
    calculateStreak,
    updateSkillProfile,
}) => {
    const progress = new PlayerProgress();
    const tracker = new AchievementTracker();
    const skillProfile = new SkillProfile();
    const currentDay = todayDay();
    const dailyMinutes = createDailyMinutes();

    const {
        practiceEvents,
        gameEvents,
        songEvents,
    } = buildProgressEventBuckets(events);

    const practiceSummary = trackPracticeEvents({
        practiceEvents,
        progress,
        skillProfile,
        calculateStreak,
        updateSkillProfile,
        currentDay,
        dailyMinutes,
    });
    logGameEvents(gameEvents, progress, skillProfile, SkillCategory);

    const now = toTrackerTimestamp(Date.now());
    const gameStats = buildGameStats(gameEvents);
    unlockGameAchievements(tracker, gameStats, now);

    const playedGames = collectPlayedGames(gameEvents, practiceEvents);
    const streak = calculateStreakFromDays(calculateStreak, practiceSummary.uniqueDays);
    unlockProgressMilestones({
        tracker,
        progress,
        totalMinutes: practiceSummary.totalMinutes,
        streak,
        playedGamesCount: playedGames.size,
        practiceCount: practiceEvents.length,
        timestamp: now,
    });

    const weekMinutes = practiceSummary.weekMinutes + applySongEvents({
        songEvents,
        progress,
        skillProfile,
        SkillCategory,
        currentDay,
        dailyMinutes,
    });

    applyRecordedAchievements(events, tracker);
    tracker.check_progress(progress, now);

    return {
        progress,
        tracker,
        streak,
        weekMinutes,
        dailyMinutes,
        skills: snapshotSkills(skillProfile),
        weakestSkill: skillProfile.weakest_skill(),
        gameEvents,
    };
};
