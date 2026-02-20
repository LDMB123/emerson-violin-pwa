import { clamp, todayDay } from '../utils/math.js';
import {
    buildProgressEventBuckets,
    createDailyMinutes,
    addMinutesToDailyWindow,
} from './progress-model-events.js';
import {
    composeProgressResult,
    loadSupplementaryProgressData,
} from './progress-model-result.js';

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

export const buildFallbackProgress = async (events, error) => {
    if (error) {
        console.warn('[progress] Falling back to local summary model', error);
    }

    const {
        practiceEvents,
        gameEvents,
        songEvents,
    } = buildProgressEventBuckets(events);
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
    return composeProgressResult({
        progress,
        tracker: createFallbackTracker(events),
        streak: Math.max(0, uniqueDays.size),
        weekMinutes,
        dailyMinutes,
        skills,
        weakestSkill: weakestSkillFromValues(skills),
        gameEvents,
        supplemental,
    });
};
