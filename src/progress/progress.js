import { whenReady } from '../utils/dom-ready.js';
import { removeJSON } from '../persistence/storage.js';
import { loadEvents, saveEvents } from '../persistence/loaders.js';
import { getCore } from '../wasm/load-core.js';
import { createSkillProfileUtils } from '../utils/skill-profile.js';
import { minutesForInput, toTrackerTimestamp, formatRecentScore, coachMessageFor, buildRadarPoints } from './progress-utils.js';
import { clamp, todayDay } from '../utils/math.js';
import { EVENTS_KEY as EVENT_KEY, UI_STATE_KEY as PERSIST_KEY } from '../persistence/storage-keys.js';
import { PRACTICE_RECORDED, GAME_RECORDED, GOAL_TARGET_CHANGE, ACHIEVEMENT_UNLOCKED } from '../utils/event-names.js';
import { setBadge } from '../notifications/badging.js';
import { GAME_LABELS } from '../utils/recommendations-utils.js';
import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadCurriculumState } from '../curriculum/state.js';
import { getCurriculumContent } from '../curriculum/content-loader.js';
import { loadSongProgressState } from '../songs/song-progression.js';
import { loadGameMasteryState } from '../games/game-mastery.js';
import { getSongCatalog } from '../songs/song-library.js';
import { GAME_META } from '../games/game-config.js';

const BADGE_META = {
    first_note:    { name: 'First Note',    artSrc: null },
    streak_7:      { name: 'Week Warrior',   artSrc: './assets/badges/badge_practice_streak_1769390952199.webp' },
    level_5:       { name: 'Rising Star',    artSrc: null },
    practice_100:  { name: 'Dedicated',      artSrc: null },
    pitch_perfect: { name: 'Pitch Perfect',  artSrc: './assets/badges/badge_pitch_master_1769390924763.webp' },
    rhythm_master: { name: 'Rhythm Master',  artSrc: './assets/badges/badge_rhythm_star_1769390938421.webp' },
    bow_hero:      { name: 'Bow Hero',       artSrc: './assets/badges/badge_bow_hero_1769390964607.webp' },
    ear_training:  { name: 'Golden Ear',     artSrc: './assets/badges/badge_ear_training_1769391019017.webp' },
    all_games:     { name: 'Game Master',    artSrc: null },
};

const PRACTICE_GAME_RULES = [
    { test: /^pq-step-/, id: 'pitch-quest' },
    { test: /^rd-set-/, id: 'rhythm-dash' },
    { test: /^nm-card-/, id: 'note-memory' },
    { test: /^et-step-/, id: 'ear-trainer' },
    { test: /^bh-step-/, id: 'bow-hero' },
    { test: /^sq-step-/, id: 'string-quest' },
    { test: /^rp-pattern-/, id: 'rhythm-painter' },
    { test: /^ss-step-/, id: 'story-song' },
    { test: /^pz-step-/, id: 'pizzicato' },
    { test: /^tt-step-/, id: 'tuning-time' },
    { test: /^mm-step-/, id: 'melody-maker' },
    { test: /^sp-step-/, id: 'scale-practice' },
    { test: /^dc-step-/, id: 'duet-challenge' },
];

const FILLED_STAR = String.fromCharCode(9733);
const EMPTY_STAR = String.fromCharCode(9734);

let xpFillEl = null;
let xpInfoEl = null;
let levelEl = null;
let streakEl = null;
let homeStreakEl = null;
let weekMinutesEl = null;
let levelLabelEl = null;
let levelFillEl = null;
let dailyGoalValueEl = null;
let dailyGoalFillEl = null;
let dailyGoalTrackEl = null;
let gamesLevelLabelEl = null;
let gamesLevelFillEl = null;
let gamesLevelTrackEl = null;
let xpTrackEl = null;
let coachSpeechEl = null;
let resetButton = null;
let parentChartLineEl = null;
let parentChartPointsEl = null;
let parentSummaryEl = null;
let parentGoalFillEl = null;
let parentGoalValueEl = null;
let parentGoalTrackEl = null;
let parentSkillStars = [];
let coachStarsEl = null;
let recentGameEls = [];
let recentGamesEmptyEl = null;
let progressCurriculumMapEl = null;
let progressSongHeatmapEl = null;
let progressGameMasteryEl = null;
let progressNextActionsEl = null;
let parentCurriculumMapEl = null;
let parentSongHeatmapEl = null;
let parentGameMasteryEl = null;
let parentNextActionsEl = null;

let achievementEls = [];
let radarShapeEl = null;
let radarPointEls = [];

const resolveElements = () => {
    xpFillEl = document.querySelector('[data-progress="xp-fill"]');
    xpInfoEl = document.querySelector('[data-progress="xp-info"]');
    levelEl = document.querySelector('[data-progress="level"]');
    streakEl = document.querySelector('[data-progress="streak-days"]');
    homeStreakEl = document.querySelector('[data-progress="home-streak"]');
    weekMinutesEl = document.querySelector('[data-progress="week-minutes"]');
    levelLabelEl = document.querySelector('[data-progress="level-label"]');
    levelFillEl = document.querySelector('[data-progress="level-fill"]');
    dailyGoalValueEl = document.querySelector('[data-progress="daily-goal-value"]');
    dailyGoalFillEl = document.querySelector('[data-progress="daily-goal-fill"]');
    dailyGoalTrackEl = document.querySelector('[data-progress="daily-goal-track"]');
    gamesLevelLabelEl = document.querySelector('[data-progress="games-level-label"]');
    gamesLevelFillEl = document.querySelector('[data-progress="games-level-fill"]');
    gamesLevelTrackEl = document.querySelector('[data-progress="games-level-track"]');
    xpTrackEl = document.querySelector('[data-progress="xp-track"]');
    coachSpeechEl = document.querySelector('[data-progress="coach-speech"]');
    resetButton = document.querySelector('#reset-progress');
    parentChartLineEl = document.querySelector('[data-parent="week-line"]');
    parentChartPointsEl = document.querySelector('[data-parent="week-points"]');
    parentSummaryEl = document.querySelector('[data-parent="week-summary"]');
    parentGoalFillEl = document.querySelector('[data-parent="goal-fill"]');
    parentGoalValueEl = document.querySelector('[data-parent="goal-value"]');
    parentGoalTrackEl = document.querySelector('[data-parent="goal-track"]');
    parentSkillStars = Array.from(document.querySelectorAll('[data-parent-skill]'));
    coachStarsEl = document.querySelector('[data-coach="stars"]');
    recentGameEls = Array.from(document.querySelectorAll('[data-recent-game]'));
    recentGamesEmptyEl = document.querySelector('[data-recent-games-empty]');
    progressCurriculumMapEl = document.querySelector('[data-progress-curriculum-map]');
    progressSongHeatmapEl = document.querySelector('[data-progress-song-heatmap]');
    progressGameMasteryEl = document.querySelector('[data-progress-game-mastery]');
    progressNextActionsEl = document.querySelector('[data-progress-next-actions]');
    parentCurriculumMapEl = document.querySelector('[data-parent-curriculum-map]');
    parentSongHeatmapEl = document.querySelector('[data-parent-song-heatmap]');
    parentGameMasteryEl = document.querySelector('[data-parent-game-mastery]');
    parentNextActionsEl = document.querySelector('[data-parent-next-actions]');
    achievementEls = Array.from(document.querySelectorAll('[data-achievement]'));
    radarShapeEl = document.querySelector('[data-radar="shape"]');
    radarPointEls = Array.from(document.querySelectorAll('.radar-point[data-skill]'));
};

const getDailyGoalTarget = () => {
    const raw = document.documentElement.dataset.dailyGoalTarget
        || dailyGoalValueEl?.textContent
        || '15';
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 15 : parsed;
};
const getWeeklyGoalTarget = () => {
    const raw = document.documentElement.dataset.weeklyGoalTarget
        || parentGoalValueEl?.textContent?.split('/')?.[1]
        || '90';
    const parsed = Number.parseInt(String(raw).trim(), 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 90 : parsed;
};

const updateProgressTrack = (el, percent, text) => {
    if (!el) return;
    const value = clamp(Math.round(percent), 0, 100);
    el.setAttribute('aria-valuenow', String(value));
    if (text) {
        el.setAttribute('aria-valuetext', text);
    }
};

const byDayAscending = (left, right) => left.day - right.day;
const byTimestampAscending = (left, right) => (left.timestamp || 0) - (right.timestamp || 0);

const collectPracticeEvents = (events) => events
    .filter((event) => event.type === 'practice')
    .slice()
    .sort(byDayAscending);

const collectGameEvents = (events) => events
    .filter((event) => event.type === 'game')
    .slice()
    .sort(byTimestampAscending);

const collectSongEvents = (events) => events
    .filter((event) => event.type === 'song')
    .slice()
    .sort(byTimestampAscending);

const createDailyMinutes = () => Array.from({ length: 7 }, () => 0);

const addMinutesToDailyWindow = (dailyMinutes, currentDay, day, minutes) => {
    const offset = currentDay - day;
    if (offset < 0 || offset > 6) return false;
    const index = 6 - offset;
    dailyMinutes[index] += minutes;
    return true;
};

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

const buildRecentGames = (gameEvents) => gameEvents
    .slice(-3)
    .reverse()
    .map((event) => ({
        id: event.id,
        label: GAME_LABELS[event.id] || event.id || 'Game',
        scoreLabel: formatRecentScore(event),
    }));

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

const loadSupplementaryProgressData = async () => {
    const [
        curriculumState,
        curriculumContent,
        songProgressState,
        gameMasteryState,
        recommendations,
        songCatalog,
    ] = await Promise.all([
        loadCurriculumState().catch(() => ({ completedUnitIds: [], currentUnitId: null })),
        getCurriculumContent().catch(() => ({ units: [] })),
        loadSongProgressState().catch(() => ({ songs: {} })),
        loadGameMasteryState().catch(() => ({ games: {} })),
        getLearningRecommendations().catch(() => ({ nextActions: [], mission: null })),
        getSongCatalog().catch(() => ({ byId: {}, songs: [] })),
    ]);

    return {
        curriculumState,
        curriculumContent,
        songProgressState,
        gameMasteryState,
        recommendations,
        songCatalog,
    };
};

const createFallbackTracker = (events) => {
    const unlockedIds = new Set(
        (Array.isArray(events) ? events : [])
            .filter((event) => event?.type === 'achievement' && typeof event?.id === 'string')
            .map((event) => event.id),
    );
    return {
        unlock: (id) => {
            if (id) unlockedIds.add(id);
        },
        is_unlocked: (id) => unlockedIds.has(id),
        check_progress: () => undefined,
    };
};

const createFallbackProgressModel = ({ totalMinutes, gameCount, songCount }) => {
    const xp = Math.max(0, Math.round((totalMinutes * 5) + (gameCount * 9) + (songCount * 7)));
    const levelSize = 120;
    const level = Math.max(1, Math.floor(xp / levelSize) + 1);
    const previousLevelXp = (level - 1) * levelSize;
    const nextLevelXp = level * levelSize;
    return {
        level,
        xp,
        xp_to_next_level: () => Math.max(0, nextLevelXp - xp),
        level_progress: () => clamp(
            Math.round(((xp - previousLevelXp) / Math.max(1, nextLevelXp - previousLevelXp)) * 100),
            0,
            100,
        ),
    };
};

const average = (values, fallback = 60) => {
    const usable = values.filter((value) => Number.isFinite(value));
    if (!usable.length) return fallback;
    return usable.reduce((sum, value) => sum + value, 0) / usable.length;
};

const weakestSkillFromValues = (skills) => (
    Object.entries(skills).sort((left, right) => left[1] - right[1])[0]?.[0] || 'pitch'
);

const estimateFallbackSkills = ({ practiceMinutes, gameEvents, songEvents }) => {
    const gameScores = gameEvents.map((event) => (
        Number.isFinite(event.accuracy) ? Number(event.accuracy) : Number(event.score)
    ));
    const songScores = songEvents.map((event) => (
        Number.isFinite(event.accuracy) ? Number(event.accuracy) : Number(event.score)
    ));
    const avgGame = average(gameScores, 62);
    const avgSong = average(songScores, 64);
    const practiceBoost = clamp(Math.round(practiceMinutes / 6), 0, 20);
    return {
        pitch: clamp(Math.round((avgGame * 0.7) + (avgSong * 0.3)), 25, 100),
        rhythm: clamp(Math.round(avgGame + (practiceBoost * 0.6)), 25, 100),
        bow_control: clamp(Math.round((avgGame * 0.65) + 15 + practiceBoost), 25, 100),
        posture: clamp(Math.round(50 + practiceBoost), 25, 100),
        reading: clamp(Math.round((avgSong * 0.85) + (practiceBoost * 0.4)), 25, 100),
    };
};

const buildFallbackProgress = async (events, error) => {
    if (error) {
        console.warn('[progress] Falling back to local summary model', error);
    }

    const practiceEvents = collectPracticeEvents(events);
    const gameEvents = collectGameEvents(events);
    const songEvents = collectSongEvents(events);
    const currentDay = todayDay();
    const dailyMinutes = createDailyMinutes();
    const uniqueDays = new Set();

    let totalMinutes = 0;
    let weekMinutes = 0;

    for (const event of practiceEvents) {
        const minutes = Math.max(0, Math.round(Number(event.minutes) || 0));
        const eventDay = Number(event.day);
        totalMinutes += minutes;
        if (Number.isFinite(eventDay)) uniqueDays.add(eventDay);
        if (Number.isFinite(eventDay) && addMinutesToDailyWindow(dailyMinutes, currentDay, eventDay, minutes)) {
            weekMinutes += minutes;
        }
    }

    for (const event of songEvents) {
        if (!Number.isFinite(event.duration)) continue;
        const minutes = Math.max(0, Math.round(Number(event.duration) / 60));
        const eventDay = Number(event.day);
        totalMinutes += minutes;
        if (Number.isFinite(eventDay) && addMinutesToDailyWindow(dailyMinutes, currentDay, eventDay, minutes)) {
            weekMinutes += minutes;
        }
    }

    const skills = estimateFallbackSkills({
        practiceMinutes: totalMinutes,
        gameEvents,
        songEvents,
    });

    const progress = createFallbackProgressModel({
        totalMinutes,
        gameCount: gameEvents.length,
        songCount: songEvents.length,
    });

    const supplemental = await loadSupplementaryProgressData();
    return {
        progress,
        tracker: createFallbackTracker(events),
        streak: Math.max(0, uniqueDays.size),
        weekMinutes,
        dailyMinutes,
        skills,
        weakestSkill: weakestSkillFromValues(skills),
        recentGames: buildRecentGames(gameEvents),
        ...supplemental,
    };
};

const buildProgress = async (events) => {
    try {
        const { PlayerProgress, AchievementTracker, SkillProfile, SkillCategory, calculate_streak: calculateStreak } = await getCore();
        const { updateSkillProfile } = createSkillProfileUtils(SkillCategory);
        const progress = new PlayerProgress();
        const tracker = new AchievementTracker();
        const skillProfile = new SkillProfile();
        const currentDay = todayDay();
        const dailyMinutes = createDailyMinutes();

        const practiceEvents = collectPracticeEvents(events);
        const gameEvents = collectGameEvents(events);
        const songEvents = collectSongEvents(events);

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
        const supplemental = await loadSupplementaryProgressData();

        return {
            progress,
            tracker,
            streak,
            weekMinutes,
            dailyMinutes,
            skills: snapshotSkills(skillProfile),
            weakestSkill: skillProfile.weakest_skill(),
            recentGames: buildRecentGames(gameEvents),
            ...supplemental,
        };
    } catch (error) {
        return buildFallbackProgress(events, error);
    }
};

let pendingUIData = null;
let rafId = 0;

const setFillWidth = (el, percent) => {
    if (el) el.style.width = `${percent}%`;
};

const formatStars = (value) => {
    const stars = clamp(Math.round(value / 20), 1, 5);
    return `${FILLED_STAR.repeat(stars)}${EMPTY_STAR.repeat(5 - stars)}`;
};

const getXpState = (progress) => {
    const xpCurrent = progress.xp;
    const xpRemaining = progress.xp_to_next_level();
    const xpTarget = xpRemaining === 0 ? xpCurrent : xpCurrent + xpRemaining;
    const xpPercent = clamp(progress.level_progress(), 0, 100);
    return { xpCurrent, xpTarget, xpPercent };
};

const renderXpState = (progress) => {
    const { xpCurrent, xpTarget, xpPercent } = getXpState(progress);
    if (levelEl) levelEl.textContent = String(progress.level);
    setFillWidth(xpFillEl, xpPercent);
    if (xpInfoEl) xpInfoEl.textContent = `${xpCurrent} / ${xpTarget} XP`;
    updateProgressTrack(xpTrackEl, xpPercent, `${xpCurrent} of ${xpTarget} XP`);
    setFillWidth(levelFillEl, xpPercent);
    if (levelLabelEl) levelLabelEl.textContent = `Level ${progress.level}`;
    setFillWidth(gamesLevelFillEl, xpPercent);
    if (gamesLevelLabelEl) gamesLevelLabelEl.textContent = `Level ${progress.level}`;
    updateProgressTrack(gamesLevelTrackEl, xpPercent, `Level ${progress.level} progress`);
};

const renderSummary = (streak, weekMinutes, weakestSkill) => {
    if (streakEl) streakEl.textContent = String(streak);
    if (homeStreakEl) homeStreakEl.textContent = String(streak);
    if (weekMinutesEl) weekMinutesEl.textContent = String(weekMinutes);
    if (!coachSpeechEl) return;
    const textEl = coachSpeechEl.querySelector('.coach-bubble-text') || coachSpeechEl;
    textEl.textContent = coachMessageFor(weakestSkill);
};

const renderDailyGoal = (dailyMinutes) => {
    const goalTarget = getDailyGoalTarget();
    if (dailyGoalValueEl) dailyGoalValueEl.textContent = String(goalTarget);
    if (!dailyGoalFillEl || !Array.isArray(dailyMinutes)) return;
    const todayMinutes = dailyMinutes[dailyMinutes.length - 1] || 0;
    const percent = clamp(Math.round((todayMinutes / goalTarget) * 100), 0, 100);
    setFillWidth(dailyGoalFillEl, percent);
    updateProgressTrack(dailyGoalTrackEl, percent, `${todayMinutes} of ${goalTarget} minutes`);
};

const buildDailyChartPoints = (dailyMinutes) => {
    const maxMinutes = Math.max(30, ...dailyMinutes);
    const step = 280 / 6;
    return dailyMinutes.map((minutes, index) => {
        const x = 20 + (index * step);
        const ratio = minutes / maxMinutes;
        const y = 140 - Math.round(ratio * 120);
        return { x, y };
    });
};

const renderParentGoals = (weekMinutes) => {
    const weeklyTarget = getWeeklyGoalTarget();
    const percent = clamp(Math.round((weekMinutes / weeklyTarget) * 100), 0, 100);
    setFillWidth(parentGoalFillEl, percent);
    updateProgressTrack(parentGoalTrackEl, percent, `${weekMinutes} of ${weeklyTarget} minutes`);
    if (parentGoalValueEl) parentGoalValueEl.textContent = `${weekMinutes} / ${weeklyTarget}`;
};

const renderParentChart = (dailyMinutes, weekMinutes) => {
    if (!Array.isArray(dailyMinutes)) return;
    const points = buildDailyChartPoints(dailyMinutes);
    if (parentChartLineEl) {
        const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
        parentChartLineEl.setAttribute('d', path);
    }
    if (parentChartPointsEl) {
        parentChartPointsEl.innerHTML = points.map((point) => `<circle cx=\"${point.x}\" cy=\"${point.y}\" r=\"4\"></circle>`).join('');
    }
    if (parentSummaryEl) parentSummaryEl.textContent = `Total: ${weekMinutes} minutes`;
    renderParentGoals(weekMinutes);
};

const renderCoachStars = (skills) => {
    if (!coachStarsEl || !skills) return;
    const overall = Math.round((skills.pitch + skills.rhythm + skills.bow_control + skills.posture + skills.reading) / 5);
    coachStarsEl.textContent = formatStars(overall);
};

const renderParentSkillStars = (skills) => {
    if (!skills || !parentSkillStars.length) return;
    parentSkillStars.forEach((el) => {
        const key = el.dataset.parentSkill;
        const value = skills[key] ?? 0;
        el.textContent = formatStars(value);
    });
};

const triggerMascotCelebration = () => {
    const mascot = document.querySelector('.progress-mascot');
    if (!mascot || mascot.classList.contains('is-celebrating')) return;
    mascot.classList.add('is-celebrating');
    mascot.addEventListener('animationend', () => {
        mascot.classList.remove('is-celebrating');
    }, { once: true });
};

const dispatchAchievementUnlocked = (id) => {
    const meta = BADGE_META[id];
    if (!meta) return;
    document.dispatchEvent(new CustomEvent(ACHIEVEMENT_UNLOCKED, {
        detail: { id, name: meta.name, artSrc: meta.artSrc },
    }));
};

const celebrateAchievementUnlock = (el, id) => {
    el.classList.add('just-unlocked');
    const art = el.querySelector('.badge-art');
    if (art) {
        art.addEventListener('animationend', () => {
            el.classList.remove('just-unlocked');
        }, { once: true });
    }
    triggerMascotCelebration();
    dispatchAchievementUnlocked(id);
};

const renderAchievements = (tracker) => {
    achievementEls.forEach((el) => {
        const id = el.dataset.achievement;
        if (!id) return;
        const wasLocked = el.classList.contains('locked');
        const unlocked = tracker.is_unlocked(id);
        el.classList.toggle('unlocked', unlocked);
        el.classList.toggle('locked', !unlocked);
        if (unlocked && wasLocked) {
            celebrateAchievementUnlock(el, id);
        }
    });
};

const renderRecentGames = (recentGames) => {
    if (!recentGameEls.length) return;
    const hasGames = Array.isArray(recentGames) && recentGames.length > 0;
    recentGameEls.forEach((el, index) => {
        const game = hasGames ? recentGames[index] : null;
        const titleEl = el.querySelector('[data-recent-game-title]');
        const scoreEl = el.querySelector('[data-recent-game-score]');
        if (!game) {
            el.hidden = true;
            return;
        }
        el.hidden = false;
        if (titleEl) titleEl.textContent = game.label;
        if (scoreEl) scoreEl.textContent = game.scoreLabel;
    });
    if (recentGamesEmptyEl) recentGamesEmptyEl.hidden = hasGames;
};

const renderRadar = (skills) => {
    if (!radarShapeEl || !skills) return;
    const points = buildRadarPoints(skills);
    radarShapeEl.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
    const pointMap = new Map(points.map((point) => [point.key, point]));
    radarPointEls.forEach((el) => {
        const point = pointMap.get(el.dataset.skill);
        if (!point) return;
        el.setAttribute('cx', point.x);
        el.setAttribute('cy', point.y);
    });
};

const renderPathLocks = (level) => {
    const pathNodes = document.querySelectorAll('.path-node[data-path-level]');
    pathNodes.forEach((node) => {
        const required = Number.parseInt(node.dataset.pathLevel || '1', 10);
        if (Number.isNaN(required)) return;
        node.classList.toggle('locked', level < required);
    });
};

const renderChipGrid = (container, chips, emptyText) => {
    if (!container) return;
    container.replaceChildren();
    if (!Array.isArray(chips) || !chips.length) {
        const empty = document.createElement('p');
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }

    chips.forEach((chip) => {
        const row = document.createElement('div');
        row.className = 'learning-chip';
        if (chip.state) row.dataset.state = chip.state;
        if (chip.tier) row.dataset.tier = chip.tier;

        const label = document.createElement('span');
        label.textContent = chip.label;
        const value = document.createElement('span');
        value.textContent = chip.value;

        row.append(label, value);
        container.appendChild(row);
    });
};

const renderCurriculumMap = (curriculumContent, curriculumState, recommendations) => {
    const units = Array.isArray(curriculumContent?.units) ? curriculumContent.units : [];
    const completed = new Set(Array.isArray(curriculumState?.completedUnitIds) ? curriculumState.completedUnitIds : []);
    const currentId = curriculumState?.currentUnitId || recommendations?.mission?.unitId || null;

    const chips = units.map((unit, index) => {
        const isComplete = completed.has(unit.id);
        const isCurrent = !isComplete && unit.id === currentId;
        return {
            label: `${index + 1}. ${unit.title}`,
            value: isComplete ? 'Complete' : isCurrent ? 'Current' : 'Queued',
            state: isComplete ? 'complete' : isCurrent ? 'current' : 'queued',
        };
    });

    renderChipGrid(progressCurriculumMapEl, chips, 'Curriculum map will appear after your first mission.');
    renderChipGrid(parentCurriculumMapEl, chips, 'Curriculum map will appear after your first mission.');
};

const songTier = (score) => {
    const safe = Math.max(0, Math.min(100, Math.round(score || 0)));
    if (safe >= 92) return 'gold';
    if (safe >= 80) return 'silver';
    if (safe >= 60) return 'bronze';
    return 'foundation';
};

const renderSongHeatmap = (songProgressState, songCatalog) => {
    const entries = Object.entries(songProgressState?.songs || {})
        .map(([id, entry]) => ({ id, ...(entry || {}) }))
        .sort((left, right) => (right.bestAccuracy || 0) - (left.bestAccuracy || 0))
        .slice(0, 12);

    const byId = songCatalog?.byId || {};
    const chips = entries.map((entry) => ({
        label: byId?.[entry.id]?.title || entry.id,
        value: `${Math.round(entry.bestAccuracy || 0)}% · ${Math.round(entry.attempts || 0)} runs`,
        tier: songTier(entry.bestAccuracy || 0),
    }));

    renderChipGrid(progressSongHeatmapEl, chips, 'No song mastery data yet.');
    renderChipGrid(parentSongHeatmapEl, chips, 'No song mastery data yet.');
};

const renderGameMasteryMatrix = (gameMasteryState) => {
    const chips = Object.keys(GAME_META || {})
        .map((id) => {
            const entry = gameMasteryState?.games?.[id] || null;
            const tier = entry?.tier || 'foundation';
            const attempts = Math.max(0, Math.round(entry?.attempts || 0));
            return {
                label: GAME_LABELS[id] || id,
                value: `${tier} · ${attempts} runs`,
                tier,
            };
        });

    renderChipGrid(progressGameMasteryEl, chips, 'No game mastery data yet.');
    renderChipGrid(parentGameMasteryEl, chips, 'No game mastery data yet.');
};

const renderNextActions = (recommendations) => {
    const actions = Array.isArray(recommendations?.nextActions) ? recommendations.nextActions : [];
    const render = (target) => {
        if (!target) return;
        target.replaceChildren();
        if (!actions.length) {
            const fallback = document.createElement('li');
            fallback.textContent = 'Complete one mission step to get next teaching actions.';
            target.appendChild(fallback);
            return;
        }
        actions.slice(0, 3).forEach((action) => {
            const item = document.createElement('li');
            if (action?.href) {
                const link = document.createElement('a');
                link.href = action.href;
                link.textContent = action.label || 'Next step';
                item.appendChild(link);
            } else {
                item.textContent = action?.label || 'Next step';
            }
            if (action?.rationale) {
                item.append(` — ${action.rationale}`);
            }
            target.appendChild(item);
        });
    };

    render(progressNextActionsEl);
    render(parentNextActionsEl);
};

const applyUI = ({
    progress,
    tracker,
    streak,
    weekMinutes,
    dailyMinutes,
    skills,
    weakestSkill,
    recentGames,
    curriculumState,
    curriculumContent,
    songProgressState,
    gameMasteryState,
    recommendations,
    songCatalog,
}) => {
    renderXpState(progress);
    renderSummary(streak, weekMinutes, weakestSkill);
    renderDailyGoal(dailyMinutes);
    renderParentChart(dailyMinutes, weekMinutes);
    renderCoachStars(skills);
    renderParentSkillStars(skills);
    renderAchievements(tracker);
    renderRecentGames(recentGames);
    renderRadar(skills);
    renderPathLocks(progress.level);
    renderCurriculumMap(curriculumContent, curriculumState, recommendations);
    renderSongHeatmap(songProgressState, songCatalog);
    renderGameMasteryMatrix(gameMasteryState);
    renderNextActions(recommendations);
    setBadge(Math.max(0, Math.min(99, Number(streak) || 0)));
};

const updateUI = (data) => {
    pendingUIData = data;
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            if (pendingUIData) applyUI(pendingUIData);
        });
    }
};

const initProgress = async () => {
    resolveElements();
    const events = await loadEvents();
    const summary = await buildProgress(events);
    updateUI(summary);

    if (resetButton && resetButton.dataset.progressBound !== 'true') {
        resetButton.dataset.progressBound = 'true';
        resetButton.addEventListener('click', resetProgress);
    }
};

const recordPracticeEvent = async (input) => {
    const events = await loadEvents();
    const earned = new Set(events.filter((event) => event.type === 'practice').map((event) => event.id));
    const allowRepeat = /^goal-step-focus-/.test(input.id);
    if (!allowRepeat && earned.has(input.id)) return;

    const entry = {
        type: 'practice',
        id: input.id,
        minutes: minutesForInput(input),
        day: todayDay(),
        timestamp: Date.now(),
    };

    events.push(entry);
    await saveEvents(events);
    document.dispatchEvent(new CustomEvent(PRACTICE_RECORDED, { detail: entry }));

    const summary = await buildProgress(events);
    updateUI(summary);
};

const recordAchievementEvent = async (id) => {
    if (!id) return;
    const events = await loadEvents();
    const already = new Set(events.filter((event) => event.type === 'achievement').map((event) => event.id));
    if (already.has(id)) return;

    events.push({ type: 'achievement', id, day: todayDay(), timestamp: Date.now() });
    await saveEvents(events);

    const summary = await buildProgress(events);
    updateUI(summary);
};

const checkMilestoneAchievements = () => {
    const pitchQuestDone = ['pq-step-1', 'pq-step-2', 'pq-step-3', 'pq-step-4', 'pq-step-5', 'pq-step-6']
        .every((id) => document.getElementById(id)?.checked);
    const rhythmDone = ['rd-set-1', 'rd-set-2', 'rd-set-3']
        .every((id) => document.getElementById(id)?.checked);
    const bowDone = ['bh-step-1', 'bh-step-2', 'bh-step-3', 'bh-step-4', 'bh-step-5']
        .every((id) => document.getElementById(id)?.checked);
    const earDone = ['et-step-1', 'et-step-2', 'et-step-3', 'et-step-4']
        .every((id) => document.getElementById(id)?.checked);

    if (pitchQuestDone) recordAchievementEvent('pitch_perfect');
    if (rhythmDone) recordAchievementEvent('rhythm_master');
    if (bowDone) recordAchievementEvent('bow_hero');
    if (earDone) recordAchievementEvent('ear_training');
};

const handleChange = (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type !== 'checkbox') return;
    if (!input.checked) return;
    if (!input.id) return;
    if (input.id.startsWith('setting-')) return;
    if (input.id === 'parent-reminder-toggle') return;
    if (input.id === 'focus-timer') return;
    if (input.id.startsWith('song-play-')) return;
    if (input.dataset.progressIgnore === 'true') return;

    recordPracticeEvent(input);
    checkMilestoneAchievements();
};

const resetProgress = async () => {
    const ok = window.confirm('Reset all progress and achievements? This cannot be undone.');
    if (!ok) return;
    await removeJSON(EVENT_KEY);
    await removeJSON(PERSIST_KEY);
    location.reload();
};

document.addEventListener('change', handleChange);
document.addEventListener(GAME_RECORDED, async () => {
    const events = await loadEvents();
    const summary = await buildProgress(events);
    updateUI(summary);
});

document.addEventListener(GOAL_TARGET_CHANGE, async () => {
    const events = await loadEvents();
    const summary = await buildProgress(events);
    updateUI(summary);
});
export const init = initProgress;
whenReady(initProgress);
