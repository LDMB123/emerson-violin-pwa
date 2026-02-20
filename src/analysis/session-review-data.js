import { clamp, todayDay } from '../utils/math.js';

const buildSongEvents = (events) => events.filter((event) => event.type === 'song');

const buildRecentAccuracies = (songEvents, limit = 6) =>
    songEvents.slice(-limit).map((event) => clamp(event.accuracy || 0, 0, 100));

const calculateTodayMinutes = (events, day = todayDay()) =>
    events.reduce((sum, event) => {
        if (event.day !== day) return sum;
        if (event.type === 'practice') return sum + (event.minutes || 0);
        if (event.type === 'song') return sum + Math.round((event.elapsed || event.duration || 0) / 60);
        return sum;
    }, 0);

const calculateAccuracyAverage = (songEvents, limit = 5) => {
    if (!songEvents.length) return 0;
    const recent = songEvents.slice(-limit);
    const total = recent.reduce((sum, event) => sum + (event.accuracy || 0), 0);
    return Math.round(total / recent.length);
};

export const buildSessionStats = (events) => {
    const songEvents = buildSongEvents(events);

    return {
        songEvents,
        recentAccuracies: buildRecentAccuracies(songEvents),
        minutes: calculateTodayMinutes(events),
        accuracyAvg: calculateAccuracyAverage(songEvents),
    };
};

export const buildSkillProfile = ({ SkillProfile, SkillCategory, events, updateSkillProfile }) => {
    const profile = new SkillProfile();

    events
        .filter((event) => event.type === 'practice')
        .forEach((event) => updateSkillProfile(profile, event.id, event.minutes || 0));

    const songEvents = buildSongEvents(events);
    songEvents.forEach((event) => {
        const accuracy = clamp(event.accuracy || 0, 0, 100);
        profile.update_skill(SkillCategory.Reading, clamp(accuracy, 30, 100));
        profile.update_skill(SkillCategory.Pitch, clamp(accuracy * 0.85, 25, 100));
    });

    events
        .filter((event) => event.type === 'game')
        .forEach((event) => {
            const score = clamp(event.accuracy || event.score || 0, 0, 100);
            if (event.id === 'rhythm-dash') profile.update_skill(SkillCategory.Rhythm, score);
            if (event.id === 'bow-hero') profile.update_skill(SkillCategory.BowControl, score);
        });

    return profile;
};
