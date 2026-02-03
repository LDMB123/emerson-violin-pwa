import { getJSON } from '@core/persistence/storage.js';
import { getLearningRecommendations } from '@core/ml/recommendations.js';
import { cloneTemplate } from '@core/utils/templates.js';
import { GAME_META, GAME_LABELS } from './game-meta.js';

const hub = document.querySelector('[data-games-hub]');
if (hub) {
    const weekMinutesEl = hub.querySelector('[data-games-week-minutes]');
    const weekTargetEl = hub.querySelector('[data-games-week-target]');
    const weekTrackEl = hub.querySelector('[data-games-week-track]');
    const focusSkillEl = hub.querySelector('[data-games-focus-skill]');
    const recommendedEl = hub.querySelector('[data-games-recommended]');
    const questsEl = hub.querySelector('[data-games-quests]');
    const startBtn = hub.querySelector('[data-games-start]');
    const metronomeBtn = hub.querySelector('[data-games-metronome]');
    const recentList = hub.querySelector('[data-games-recent]');
    const questTemplate = document.querySelector('#games-hub-quest-template');
    const emptyQuestTemplate = document.querySelector('#games-hub-quest-empty-template');
    const recentTemplate = document.querySelector('#games-hub-recent-template');

    const EVENT_KEY = 'panda-violin:events:v1';

    const todayDay = () => Math.floor(Date.now() / 86400000);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const gameStepPattern = /^(pq-step-|rd-set-|et-step-|bh-step-|sq-step-|rp-pattern-|ss-step-|pz-step-|tt-step-|mm-step-|sp-step-|dc-step-|nm-card-)/;

    const loadEvents = async () => {
        const stored = await getJSON(EVENT_KEY);
        return Array.isArray(stored) ? stored : [];
    };

    const formatMetric = (event) => {
        if (!event) return 'Score 0';
        if (Number.isFinite(event.accuracy)) return `${Math.round(event.accuracy)}%`;
        if (Number.isFinite(event.stars)) return `${Math.round(event.stars)}★`;
        if (Number.isFinite(event.score)) return `Score ${Math.round(event.score)}`;
        return 'Score 0';
    };

    const getWeeklyGoalTarget = () => {
        const raw = document.documentElement?.dataset?.weeklyGoalTarget || '90';
        const parsed = Number.parseInt(String(raw).trim(), 10);
        return Number.isNaN(parsed) || parsed <= 0 ? 90 : parsed;
    };

    const deriveGameGoal = (weeklyGoal) => {
        const base = Math.round(weeklyGoal * 0.6);
        const rounded = Math.round(base / 5) * 5;
        return clamp(rounded, 30, weeklyGoal);
    };

    const toGameLink = (id) => {
        if (!id) return '#view-games';
        if (id.startsWith('view-')) return `#${id}`;
        return `#view-game-${id}`;
    };

    const computeGameMinutes = (events) => {
        const currentDay = todayDay();
        return events
            .filter((event) => event.type === 'practice' && gameStepPattern.test(event.id || ''))
            .reduce((sum, event) => {
                const day = Number.isFinite(event.day) ? event.day : currentDay;
                const offset = currentDay - day;
                if (offset < 0 || offset > 6) return sum;
                return sum + (Number(event.minutes) || 0);
            }, 0);
    };

    const updateWeekly = (minutes, target) => {
        const percent = clamp(Math.round((minutes / Math.max(1, target)) * 100), 0, 100);
        if (weekMinutesEl) weekMinutesEl.textContent = String(minutes);
        if (weekTargetEl) weekTargetEl.textContent = String(target);
        if (weekTrackEl) {
            if ('value' in weekTrackEl) {
                weekTrackEl.value = percent;
                if (!weekTrackEl.max) weekTrackEl.max = 100;
            } else {
                weekTrackEl.setAttribute('aria-valuenow', String(percent));
            }
            weekTrackEl.setAttribute('aria-valuetext', `${minutes} of ${target} minutes`);
        }
        return percent;
    };

    const renderQuests = (meta) => {
        if (!questsEl) return;
        questsEl.replaceChildren();
        const steps = meta?.steps?.slice(0, 3) || [];
        if (!steps.length) {
            const item = cloneTemplate(emptyQuestTemplate);
            if (item) questsEl.appendChild(item);
            return;
        }
        steps.forEach((step) => {
            const item = cloneTemplate(questTemplate);
            if (!item) return;
            const time = item.querySelector('[data-quest-time]');
            if (time) time.textContent = `${Math.max(1, Math.round(step.minutes || 0))} min`;
            const text = item.querySelector('[data-quest-text]');
            if (text) text.textContent = step.label || 'Practice step';
            const cue = item.querySelector('[data-quest-cue]');
            if (cue) {
                cue.textContent = step.cue || '';
                cue.toggleAttribute('data-empty', !step.cue);
            }
            questsEl.appendChild(item);
        });
    };

    const updateRecent = (events) => {
        if (!recentList) return;
        recentList.replaceChildren();
        const recent = events
            .filter((event) => event.type === 'game')
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 3);

        recent.forEach((event) => {
            const item = cloneTemplate(recentTemplate);
            if (!item) return;
            const label = GAME_LABELS[event.id] || 'Game';
            const score = formatMetric(event);
            const labelEl = item.querySelector('[data-recent-label]');
            const scoreEl = item.querySelector('[data-recent-score]');
            if (labelEl) labelEl.textContent = label;
            if (scoreEl) scoreEl.textContent = score;
            recentList.appendChild(item);
        });
    };

    const updateHub = async () => {
        const [events, recs] = await Promise.all([
            loadEvents(),
            getLearningRecommendations(),
        ]);
        const weekMinutes = Math.round(computeGameMinutes(events));
        const weeklyGoal = getWeeklyGoalTarget();
        const gameTarget = deriveGameGoal(weeklyGoal);
        updateWeekly(weekMinutes, gameTarget);

        const recommendedId = recs?.recommendedGameId || 'pitch-quest';
        const recommendedLabel = recs?.recommendedGameLabel || GAME_LABELS[recommendedId] || 'Pitch Quest';
        const meta = GAME_META[recommendedId];
        const targetMinutes = meta?.targetMinutes || 6;
        const focusSkill = meta?.skill || recs?.skillLabel || 'Pitch';
        const tempo = Math.round(recs?.metronomeTarget || 90);

        if (focusSkillEl) focusSkillEl.textContent = focusSkill;
        if (recommendedEl) recommendedEl.textContent = `${recommendedLabel} · ${targetMinutes} min`;
        if (startBtn) {
            startBtn.setAttribute('href', toGameLink(recommendedId));
            startBtn.textContent = `Start ${recommendedLabel}`;
        }
        if (metronomeBtn) {
            metronomeBtn.dataset.metronomeBpm = String(tempo);
            metronomeBtn.setAttribute('aria-label', `Set metronome to ${tempo} BPM`);
        }

        renderQuests(meta);
        updateRecent(events);
    };

    updateHub();

    document.addEventListener('panda:practice-recorded', updateHub);
    document.addEventListener('panda:game-recorded', updateHub);
    document.addEventListener('panda:song-recorded', updateHub);
    document.addEventListener('panda:weekly-goal-change', updateHub);
    document.addEventListener('panda:ml-update', updateHub);
    document.addEventListener('panda:ml-reset', updateHub);
    document.addEventListener('panda:ml-recs', updateHub);
}
