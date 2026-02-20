import { clamp } from '../utils/math.js';
import { coachMessageFor, buildRadarPoints } from './progress-utils.js';

const FILLED_STAR = String.fromCharCode(9733);
const EMPTY_STAR = String.fromCharCode(9734);

const updateProgressTrack = (el, percent, text) => {
    if (!el) return;
    const value = clamp(Math.round(percent), 0, 100);
    el.setAttribute('aria-valuenow', String(value));
    if (text) {
        el.setAttribute('aria-valuetext', text);
    }
};

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

const renderXpState = (elements, progress) => {
    const { xpCurrent, xpTarget, xpPercent } = getXpState(progress);
    if (elements.levelEl) elements.levelEl.textContent = String(progress.level);
    setFillWidth(elements.xpFillEl, xpPercent);
    if (elements.xpInfoEl) elements.xpInfoEl.textContent = `${xpCurrent} / ${xpTarget} XP`;
    updateProgressTrack(elements.xpTrackEl, xpPercent, `${xpCurrent} of ${xpTarget} XP`);
    setFillWidth(elements.levelFillEl, xpPercent);
    if (elements.levelLabelEl) elements.levelLabelEl.textContent = `Level ${progress.level}`;
    setFillWidth(elements.gamesLevelFillEl, xpPercent);
    if (elements.gamesLevelLabelEl) elements.gamesLevelLabelEl.textContent = `Level ${progress.level}`;
    updateProgressTrack(elements.gamesLevelTrackEl, xpPercent, `Level ${progress.level} progress`);
};

const renderSummary = (elements, streak, weekMinutes, weakestSkill) => {
    if (elements.streakEl) elements.streakEl.textContent = String(streak);
    if (elements.homeStreakEl) elements.homeStreakEl.textContent = String(streak);
    if (elements.weekMinutesEl) elements.weekMinutesEl.textContent = String(weekMinutes);
    if (!elements.coachSpeechEl) return;
    const textEl = elements.coachSpeechEl.querySelector('.coach-bubble-text') || elements.coachSpeechEl;
    textEl.textContent = coachMessageFor(weakestSkill);
};

const renderDailyGoal = (elements, dailyMinutes, goalTarget) => {
    if (elements.dailyGoalValueEl) elements.dailyGoalValueEl.textContent = String(goalTarget);
    if (!elements.dailyGoalFillEl || !Array.isArray(dailyMinutes)) return;
    const todayMinutes = dailyMinutes[dailyMinutes.length - 1] || 0;
    const percent = clamp(Math.round((todayMinutes / goalTarget) * 100), 0, 100);
    setFillWidth(elements.dailyGoalFillEl, percent);
    updateProgressTrack(elements.dailyGoalTrackEl, percent, `${todayMinutes} of ${goalTarget} minutes`);
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

const renderParentGoals = (elements, weekMinutes, weeklyTarget) => {
    const percent = clamp(Math.round((weekMinutes / weeklyTarget) * 100), 0, 100);
    setFillWidth(elements.parentGoalFillEl, percent);
    updateProgressTrack(elements.parentGoalTrackEl, percent, `${weekMinutes} of ${weeklyTarget} minutes`);
    if (elements.parentGoalValueEl) elements.parentGoalValueEl.textContent = `${weekMinutes} / ${weeklyTarget}`;
};

const renderParentChart = (elements, dailyMinutes, weekMinutes, weeklyTarget) => {
    if (!Array.isArray(dailyMinutes)) return;
    const points = buildDailyChartPoints(dailyMinutes);
    if (elements.parentChartLineEl) {
        const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
        elements.parentChartLineEl.setAttribute('d', path);
    }
    if (elements.parentChartPointsEl) {
        elements.parentChartPointsEl.innerHTML = points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4"></circle>`).join('');
    }
    if (elements.parentSummaryEl) elements.parentSummaryEl.textContent = `Total: ${weekMinutes} minutes`;
    renderParentGoals(elements, weekMinutes, weeklyTarget);
};

const renderCoachStars = (elements, skills) => {
    if (!elements.coachStarsEl || !skills) return;
    const overall = Math.round((skills.pitch + skills.rhythm + skills.bow_control + skills.posture + skills.reading) / 5);
    elements.coachStarsEl.textContent = formatStars(overall);
};

const renderParentSkillStars = (elements, skills) => {
    if (!skills || !elements.parentSkillStars.length) return;
    elements.parentSkillStars.forEach((el) => {
        const key = el.dataset.parentSkill;
        const value = skills[key] ?? 0;
        el.textContent = formatStars(value);
    });
};

const renderRecentGames = (elements, recentGames) => {
    if (!elements.recentGameEls.length) return;
    const hasGames = Array.isArray(recentGames) && recentGames.length > 0;
    elements.recentGameEls.forEach((el, index) => {
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
    if (elements.recentGamesEmptyEl) elements.recentGamesEmptyEl.hidden = hasGames;
};

const renderRadar = (elements, skills) => {
    if (!elements.radarShapeEl || !skills) return;
    const points = buildRadarPoints(skills);
    elements.radarShapeEl.setAttribute('points', points.map((point) => `${point.x},${point.y}`).join(' '));
    const pointMap = new Map(points.map((point) => [point.key, point]));
    elements.radarPointEls.forEach((el) => {
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

export const renderCoreProgressUi = ({
    elements,
    progress,
    streak,
    weekMinutes,
    dailyMinutes,
    skills,
    weakestSkill,
    recentGames,
    dailyGoalTarget,
    weeklyGoalTarget,
}) => {
    renderXpState(elements, progress);
    renderSummary(elements, streak, weekMinutes, weakestSkill);
    renderDailyGoal(elements, dailyMinutes, dailyGoalTarget);
    renderParentChart(elements, dailyMinutes, weekMinutes, weeklyGoalTarget);
    renderCoachStars(elements, skills);
    renderParentSkillStars(elements, skills);
    renderRecentGames(elements, recentGames);
    renderRadar(elements, skills);
    renderPathLocks(progress.level);
};
