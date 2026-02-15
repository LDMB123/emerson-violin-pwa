import initCore, {
    PlayerProgress,
    AchievementTracker,
    SkillProfile,
    SkillCategory,
    calculate_streak,
} from '../wasm/panda_core.js';
import { getJSON, setJSON, removeJSON } from '../persistence/storage.js';
import { createSkillProfileUtils } from '../utils/skill-profile.js';

const EVENT_KEY = 'panda-violin:events:v1';
const PERSIST_KEY = 'panda-violin:ui-state:v1';

const xpFillEl = document.querySelector('[data-progress="xp-fill"]');
const xpInfoEl = document.querySelector('[data-progress="xp-info"]');
const levelEl = document.querySelector('[data-progress="level"]');
const streakEl = document.querySelector('[data-progress="streak-days"]');
const homeStreakEl = document.querySelector('[data-progress="home-streak"]');
const weekMinutesEl = document.querySelector('[data-progress="week-minutes"]');
const levelLabelEl = document.querySelector('[data-progress="level-label"]');
const levelFillEl = document.querySelector('[data-progress="level-fill"]');
const dailyGoalValueEl = document.querySelector('[data-progress="daily-goal-value"]');
const dailyGoalFillEl = document.querySelector('[data-progress="daily-goal-fill"]');
const dailyGoalTrackEl = document.querySelector('[data-progress="daily-goal-track"]');
const gamesLevelLabelEl = document.querySelector('[data-progress="games-level-label"]');
const gamesLevelFillEl = document.querySelector('[data-progress="games-level-fill"]');
const gamesLevelTrackEl = document.querySelector('[data-progress="games-level-track"]');
const xpTrackEl = document.querySelector('[data-progress="xp-track"]');
const coachSpeechEl = document.querySelector('[data-progress="coach-speech"]');
const resetButton = document.querySelector('#reset-progress');
const parentChartLineEl = document.querySelector('[data-parent="week-line"]');
const parentChartPointsEl = document.querySelector('[data-parent="week-points"]');
const parentSummaryEl = document.querySelector('[data-parent="week-summary"]');
const parentGoalFillEl = document.querySelector('[data-parent="goal-fill"]');
const parentGoalValueEl = document.querySelector('[data-parent="goal-value"]');
const parentGoalTrackEl = document.querySelector('[data-parent="goal-track"]');
const parentSkillStars = Array.from(document.querySelectorAll('[data-parent-skill]'));
const coachStarsEl = document.querySelector('[data-coach="stars"]');
const recentGameEls = Array.from(document.querySelectorAll('[data-recent-game]'));
const recentGamesEmptyEl = document.querySelector('[data-recent-games-empty]');

const achievementEls = Array.from(document.querySelectorAll('[data-achievement]'));
const radarShapeEl = document.querySelector('[data-radar="shape"]');
const radarPointEls = Array.from(document.querySelectorAll('.radar-point[data-skill]'));

const RADAR_CENTER = 100;
const RADAR_RADIUS = 80;
const RADAR_ORDER = ['pitch', 'rhythm', 'bow_control', 'posture', 'reading'];
const RADAR_ANGLES = RADAR_ORDER.map((_, index) => ((index * 2 * Math.PI) / RADAR_ORDER.length) - Math.PI / 2);
const GAME_LABELS = {
    'pitch-quest': 'Pitch Quest',
    'rhythm-dash': 'Rhythm Dash',
    'note-memory': 'Note Memory',
    'ear-trainer': 'Ear Trainer',
    'bow-hero': 'Bow Hero',
    'string-quest': 'String Quest',
    'rhythm-painter': 'Rhythm Painter',
    'story-song': 'Story Song Lab',
    pizzicato: 'Pizzicato Pop',
    'tuning-time': 'Tuning Time',
    'melody-maker': 'Melody Maker',
    'scale-practice': 'Scale Practice',
    'duet-challenge': 'Duet Challenge',
};

const todayDay = () => Math.floor(Date.now() / 86400000);
const getDailyGoalTarget = () => {
    const raw = document.documentElement?.dataset?.dailyGoalTarget
        || dailyGoalValueEl?.textContent
        || '15';
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 15 : parsed;
};
const getWeeklyGoalTarget = () => {
    const raw = document.documentElement?.dataset?.weeklyGoalTarget
        || parentGoalValueEl?.textContent?.split('/')?.[1]
        || '90';
    const parsed = Number.parseInt(String(raw).trim(), 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 90 : parsed;
};

const loadEvents = async () => {
    const stored = await getJSON(EVENT_KEY);
    return Array.isArray(stored) ? stored : [];
};

const saveEvents = async (events) => {
    await setJSON(EVENT_KEY, events);
};

const minutesForInput = (input) => {
    if (input?.dataset?.minutes) {
        const parsed = Number.parseInt(input.dataset.minutes, 10);
        if (!Number.isNaN(parsed)) return parsed;
    }
    const id = input?.id || '';
    if (/^(goal-step-|parent-goal-)/.test(id)) return 5;
    if (/^goal-(warmup|scale|song|rhythm|ear)/.test(id)) return 5;
    if (/^bow-set-/.test(id)) return 5;
    if (/^(pq-step-|rd-set-|et-step-|bh-step-|sq-step-|rp-pattern-|ss-step-|pz-step-|tt-step-|mm-step-|sp-step-|dc-step-)/.test(id)) return 2;
    if (/^nm-card-/.test(id)) return 1;
    return 1;
};

const { clamp, updateSkillProfile } = createSkillProfileUtils(SkillCategory);

const updateProgressTrack = (el, percent, text) => {
    if (!el) return;
    const value = clamp(Math.round(percent), 0, 100);
    el.setAttribute('aria-valuenow', String(value));
    if (text) {
        el.setAttribute('aria-valuetext', text);
    }
};

const toTrackerTimestamp = (value) => {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : Date.now();
    return BigInt(Math.floor(parsed));
};

const updateAppBadge = async (streak) => {
    if (!('setAppBadge' in navigator)) return;
    try {
        const value = Math.max(0, Math.min(99, Number(streak) || 0));
        if (value > 0) {
            await navigator.setAppBadge(value);
        } else if ('clearAppBadge' in navigator) {
            await navigator.clearAppBadge();
        } else {
            await navigator.setAppBadge(0);
        }
    } catch {
        // Ignore badge errors
    }
};


const buildRadarPoints = (skills) => {
    return RADAR_ORDER.map((key, index) => {
        const raw = skills?.[key] ?? 50;
        const value = clamp(raw, 0, 100) / 100;
        const radius = RADAR_RADIUS * value;
        const angle = RADAR_ANGLES[index];
        const x = RADAR_CENTER + radius * Math.cos(angle);
        const y = RADAR_CENTER + radius * Math.sin(angle);
        return { key, x: x.toFixed(1), y: y.toFixed(1) };
    });
};

const formatRecentScore = (event) => {
    if (!event) return 'Score 0';
    if (Number.isFinite(event.accuracy)) {
        return `${Math.round(event.accuracy)}%`;
    }
    if (Number.isFinite(event.stars)) {
        return `${Math.round(event.stars)}★`;
    }
    if (Number.isFinite(event.score)) {
        return `Score ${Math.round(event.score)}`;
    }
    return 'Score 0';
};

const coachMessageFor = (skill) => {
    switch (skill) {
        case 'pitch':
            return 'Let’s focus on pitch today. Use slow bows and listen for a clear ring.';
        case 'rhythm':
            return 'Let’s lock in the rhythm. Tap a steady beat before you play.';
        case 'bow_control':
            return 'Today is for smooth bowing. Keep the bow straight and relaxed.';
        case 'posture':
            return 'Quick posture check: tall spine, relaxed shoulders, soft bow hand.';
        case 'reading':
            return 'Let’s build reading skills. Follow the notes slowly and name each one.';
        default:
            return 'Let’s start with warm-ups and keep the sound smooth.';
    }
};

const buildProgress = async (events) => {
    await initCore();
    const progress = new PlayerProgress();
    const tracker = new AchievementTracker();
    const skillProfile = new SkillProfile();

    const practiceEvents = events
        .filter((event) => event.type === 'practice')
        .slice()
        .sort((a, b) => a.day - b.day);

    const uniqueDays = [];
    const seenDay = new Set();
    const currentDay = todayDay();
    let weekMinutes = 0;
    const dailyMinutes = Array.from({ length: 7 }, () => 0);

    const addToDaily = (day, minutes) => {
        const offset = currentDay - day;
        if (offset < 0 || offset > 6) return;
        const index = 6 - offset;
        dailyMinutes[index] += minutes;
    };

    for (const event of practiceEvents) {
        if (!seenDay.has(event.day)) {
            seenDay.add(event.day);
            uniqueDays.push(event.day);
        }
        const streak = calculate_streak(new Uint32Array(uniqueDays));
        progress.log_practice(event.minutes, streak);
        updateSkillProfile(skillProfile, event.id, event.minutes);
        if (event.day >= currentDay - 6) {
            weekMinutes += event.minutes;
            addToDaily(event.day, event.minutes);
        }
    }

    const gameEvents = events
        .filter((event) => event.type === 'game')
        .slice()
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const bestGameScore = (id) => {
        const scores = gameEvents
            .filter((event) => event.id === id)
            .map((event) => Number.isFinite(event.accuracy) ? event.accuracy : event.score)
            .filter((value) => Number.isFinite(value));
        return scores.length ? Math.max(...scores) : 0;
    };

    const bestGameStars = (id) => {
        const stars = gameEvents
            .filter((event) => event.id === id)
            .map((event) => Number.isFinite(event.stars) ? event.stars : 0)
            .filter((value) => Number.isFinite(value));
        return stars.length ? Math.max(...stars) : 0;
    };

    for (const event of gameEvents) {
        const score = Number.isFinite(event.score) ? Math.round(event.score) : 0;
        progress.log_game_score(event.id || 'game', Math.max(0, score));
        if (event.id === 'rhythm-dash') {
            const accuracyScore = Number.isFinite(event.accuracy) ? event.accuracy : score;
            skillProfile.update_skill(SkillCategory.Rhythm, clamp(accuracyScore, 20, 100));
        }
    }

    const now = toTrackerTimestamp(Date.now());
    if (bestGameScore('pitch-quest') >= 85) tracker.unlock('pitch_perfect', now);
    if (bestGameScore('rhythm-dash') >= 85) tracker.unlock('rhythm_master', now);
    if (bestGameScore('ear-trainer') >= 90) tracker.unlock('ear_training', now);
    if (bestGameScore('bow-hero') >= 85 || bestGameStars('bow-hero') >= 5) tracker.unlock('bow_hero', now);

    const playedGames = new Set(gameEvents.map((event) => event.id).filter(Boolean));
    const practiceGameRules = [
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

    for (const event of practiceEvents) {
        if (!event.id) continue;
        for (const rule of practiceGameRules) {
            if (rule.test.test(event.id)) {
                playedGames.add(rule.id);
                break;
            }
        }
    }
    if (playedGames.size >= practiceGameRules.length) tracker.unlock('all_games', now);

    const recentGames = gameEvents
        .slice(-3)
        .reverse()
        .map((event) => ({
            id: event.id,
            label: GAME_LABELS[event.id] || event.id || 'Game',
            scoreLabel: formatRecentScore(event),
        }));

    const songEvents = events
        .filter((event) => event.type === 'song')
        .slice()
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    for (const event of songEvents) {
        const accuracy = Number.isFinite(event.accuracy) ? Math.round(event.accuracy) : 0;
        const tier = Number.isFinite(event.tier) ? Math.round(event.tier) : accuracy;
        progress.log_song_complete(clamp(tier, 0, 100));
        skillProfile.update_skill(SkillCategory.Reading, clamp(accuracy, 30, 100));
        skillProfile.update_skill(SkillCategory.Pitch, clamp(accuracy * 0.85, 25, 100));
        if (Number.isFinite(event.duration) && event.day >= currentDay - 6) {
            const minutes = Math.round(Number(event.duration) / 60);
            weekMinutes += minutes;
            addToDaily(event.day, minutes);
        }
    }

    if (practiceEvents.length > 0) {
        tracker.unlock('first_note', toTrackerTimestamp(Date.now()));
    }

    events
        .filter((event) => event.type === 'achievement')
        .forEach((event) => {
        tracker.unlock(event.id, toTrackerTimestamp(event.timestamp));
    });

    tracker.check_progress(progress, toTrackerTimestamp(Date.now()));

    const skills = {
        pitch: skillProfile.pitch,
        rhythm: skillProfile.rhythm,
        bow_control: skillProfile.bow_control,
        posture: skillProfile.posture,
        reading: skillProfile.reading,
    };

    return {
        progress,
        tracker,
        streak: calculate_streak(new Uint32Array(uniqueDays)),
        weekMinutes,
        dailyMinutes,
        skills,
        weakestSkill: skillProfile.weakest_skill(),
        recentGames,
    };
};

const updateUI = ({ progress, tracker, streak, weekMinutes, dailyMinutes, skills, weakestSkill, recentGames }) => {
    if (levelEl) levelEl.textContent = String(progress.level);

    const xpCurrent = progress.xp;
    const xpRemaining = progress.xp_to_next_level();
    const xpTarget = xpRemaining === 0 ? xpCurrent : xpCurrent + xpRemaining;
    const xpPercent = clamp(progress.level_progress(), 0, 100);

    if (xpFillEl) xpFillEl.style.width = `${xpPercent}%`;
    if (xpInfoEl) xpInfoEl.textContent = `${xpCurrent} / ${xpTarget} XP`;
    updateProgressTrack(xpTrackEl, xpPercent, `${xpCurrent} of ${xpTarget} XP`);
    if (levelFillEl) levelFillEl.style.width = `${xpPercent}%`;
    if (levelLabelEl) levelLabelEl.textContent = `Level ${progress.level}`;
    if (gamesLevelFillEl) gamesLevelFillEl.style.width = `${xpPercent}%`;
    if (gamesLevelLabelEl) gamesLevelLabelEl.textContent = `Level ${progress.level}`;
    updateProgressTrack(gamesLevelTrackEl, xpPercent, `Level ${progress.level} progress`);

    if (streakEl) streakEl.textContent = String(streak);
    if (homeStreakEl) homeStreakEl.textContent = String(streak);
    if (weekMinutesEl) weekMinutesEl.textContent = String(weekMinutes);
    if (coachSpeechEl) coachSpeechEl.textContent = coachMessageFor(weakestSkill);

    const goalTarget = getDailyGoalTarget();
    if (dailyGoalValueEl) dailyGoalValueEl.textContent = String(goalTarget);
    if (dailyGoalFillEl && Array.isArray(dailyMinutes)) {
        const todayMinutes = dailyMinutes[dailyMinutes.length - 1] || 0;
        const percent = clamp(Math.round((todayMinutes / goalTarget) * 100), 0, 100);
        dailyGoalFillEl.style.width = `${percent}%`;
        updateProgressTrack(dailyGoalTrackEl, percent, `${todayMinutes} of ${goalTarget} minutes`);
    }

    if (Array.isArray(dailyMinutes)) {
        const maxMinutes = Math.max(30, ...dailyMinutes);
        const plotWidth = 280;
        const step = plotWidth / 6;
        const points = dailyMinutes.map((minutes, index) => {
            const x = 20 + (index * step);
            const ratio = minutes / maxMinutes;
            const y = 140 - Math.round(ratio * 120);
            return { x, y };
        });

        if (parentChartLineEl) {
            const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
            parentChartLineEl.setAttribute('d', path);
        }

        if (parentChartPointsEl) {
            parentChartPointsEl.innerHTML = points.map((point) => `<circle cx=\"${point.x}\" cy=\"${point.y}\" r=\"4\"></circle>`).join('');
        }

        if (parentSummaryEl) parentSummaryEl.textContent = `Total: ${weekMinutes} minutes`;
        if (parentGoalFillEl) {
            const weeklyTarget = getWeeklyGoalTarget();
            const percent = clamp(Math.round((weekMinutes / weeklyTarget) * 100), 0, 100);
            parentGoalFillEl.style.width = `${percent}%`;
            updateProgressTrack(parentGoalTrackEl, percent, `${weekMinutes} of ${weeklyTarget} minutes`);
        }
        if (parentGoalValueEl) {
            const weeklyTarget = getWeeklyGoalTarget();
            parentGoalValueEl.textContent = `${weekMinutes} / ${weeklyTarget}`;
        }
    }

    if (coachStarsEl && skills) {
        const overall = Math.round((skills.pitch + skills.rhythm + skills.bow_control + skills.posture + skills.reading) / 5);
        const stars = clamp(Math.round(overall / 20), 1, 5);
        const filled = String.fromCharCode(9733);
        const empty = String.fromCharCode(9734);
        coachStarsEl.textContent = `${filled.repeat(stars)}${empty.repeat(5 - stars)}`;
    }

    if (parentSkillStars.length && skills) {
        parentSkillStars.forEach((el) => {
            const key = el.dataset.parentSkill;
            const value = skills[key] ?? 0;
            const stars = clamp(Math.round(value / 20), 1, 5);
            const filled = String.fromCharCode(9733);
            const empty = String.fromCharCode(9734);
            el.textContent = `${filled.repeat(stars)}${empty.repeat(5 - stars)}`;
        });
    }

    achievementEls.forEach((el) => {
        const id = el.dataset.achievement;
        if (!id) return;
        const unlocked = tracker.is_unlocked(id);
        el.classList.toggle('unlocked', unlocked);
        el.classList.toggle('locked', !unlocked);
    });

    if (recentGameEls.length) {
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
    }

    if (radarShapeEl && skills) {
        const points = buildRadarPoints(skills);
        radarShapeEl.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
        radarPointEls.forEach((el) => {
            const key = el.dataset.skill;
            const point = points.find((p) => p.key === key);
            if (!point) return;
            el.setAttribute('cx', point.x);
            el.setAttribute('cy', point.y);
        });
    }

    const pathNodes = document.querySelectorAll('.path-node[data-path-level]');
    pathNodes.forEach((node) => {
        const required = Number.parseInt(node.dataset.pathLevel || '1', 10);
        if (Number.isNaN(required)) return;
        node.classList.toggle('locked', progress.level < required);
    });

    updateAppBadge(streak);
};

const initProgress = async () => {
    const events = await loadEvents();
    const summary = await buildProgress(events);
    updateUI(summary);
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
    document.dispatchEvent(new CustomEvent('panda:practice-recorded', { detail: entry }));

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
document.addEventListener('panda:game-recorded', async () => {
    const events = await loadEvents();
    const summary = await buildProgress(events);
    updateUI(summary);
});

document.addEventListener('panda:goal-target-change', async () => {
    const events = await loadEvents();
    const summary = await buildProgress(events);
    updateUI(summary);
});
if (resetButton) {
    resetButton.addEventListener('click', resetProgress);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProgress);
} else {
    initProgress();
}
