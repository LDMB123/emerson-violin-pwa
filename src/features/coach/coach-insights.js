import { getJSON, setJSON } from '@core/persistence/storage.js';
import { getLearningRecommendations } from '@core/ml/recommendations.js';

const container = document.querySelector('[data-coach-insights]');

if (!container) {
    // No coach insights card on this page.
} else {
    const weekMinutesEl = container.querySelector('[data-coach-week-minutes]');
    const weekTargetEl = container.querySelector('[data-coach-week-target]');
    const weekTrackEl = container.querySelector('[data-coach-week-track]');
    const skillEl = container.querySelector('[data-coach-insight-skill]');
    const nextEl = container.querySelector('[data-coach-insight-next]');
    const tipEl = container.querySelector('[data-coach-insight-tip]');
    const metronomeBtn = container.querySelector('[data-coach-metronome]');
    const gameBtn = container.querySelector('[data-coach-game]');

    const EVENT_KEY = 'panda-violin:events:v1';
    const METRONOME_PRESET_KEY = 'panda-violin:metronome-preset';
    const METRONOME_PRESET_TTL = 10 * 60 * 1000;

    const todayDay = () => Math.floor(Date.now() / 86400000);

    const loadEvents = async () => {
        const stored = await getJSON(EVENT_KEY);
        return Array.isArray(stored) ? stored : [];
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const formatMinutes = (value) => Math.max(0, Math.round(value || 0));

    const getWeeklyGoalTarget = () => {
        const raw = document.documentElement?.dataset?.weeklyGoalTarget
            || weekTargetEl?.textContent
            || '90';
        const parsed = Number.parseInt(String(raw).trim(), 10);
        return Number.isNaN(parsed) || parsed <= 0 ? 90 : parsed;
    };

    const toLessonLink = (id) => {
        if (!id) return '#view-games';
        if (id.startsWith('view-')) return `#${id}`;
        return `#view-game-${id}`;
    };

    const computeWeekMinutes = (events) => {
        const currentDay = todayDay();
        return events
            .filter((event) => event.type === 'practice')
            .reduce((sum, event) => {
                const day = Number.isFinite(event.day) ? event.day : currentDay;
                const offset = currentDay - day;
                if (offset < 0 || offset > 6) return sum;
                return sum + (Number(event.minutes) || 0);
            }, 0);
    };

    const updateWeeklyGoal = (weekMinutes, weeklyTarget) => {
        const percent = clamp(Math.round((weekMinutes / Math.max(1, weeklyTarget)) * 100), 0, 100);
        if (weekMinutesEl) weekMinutesEl.textContent = String(weekMinutes);
        if (weekTargetEl) weekTargetEl.textContent = String(weeklyTarget);
        if (weekTrackEl) {
            if ('value' in weekTrackEl) {
                weekTrackEl.value = percent;
                if (!weekTrackEl.max) weekTrackEl.max = 100;
            } else {
                weekTrackEl.setAttribute('aria-valuenow', String(percent));
            }
            weekTrackEl.setAttribute('aria-valuetext', `${weekMinutes} of ${weeklyTarget} minutes`);
        }
        return percent;
    };

    const updateRecommendations = (recs, { weekPercent, weekMinutes, weeklyTarget }) => {
        const skillLabel = recs?.skillLabel || 'Pitch';
        const gameLabel = recs?.recommendedGameLabel || 'Pitch Quest';
        const metronomeTarget = Math.round(recs?.metronomeTarget || 90);
        const remaining = Math.max(0, weeklyTarget - weekMinutes);

        if (skillEl) skillEl.textContent = skillLabel;
        if (nextEl) nextEl.textContent = `${gameLabel} · ${metronomeTarget} BPM`;
        if (gameBtn) {
            gameBtn.setAttribute('href', toLessonLink(recs?.recommendedGameId));
            gameBtn.textContent = `Play ${gameLabel}`;
        }
        if (metronomeBtn) {
            metronomeBtn.dataset.metronomeBpm = String(metronomeTarget);
            metronomeBtn.setAttribute('aria-label', `Set metronome to ${metronomeTarget} BPM`);
        }

        if (tipEl) {
            if (weekPercent >= 100) {
                tipEl.textContent = `Weekly goal met. Try a ${skillLabel.toLowerCase()} stretch today.`;
            } else if (remaining <= 10) {
                tipEl.textContent = `Only ${remaining} minutes to hit the weekly goal. Finish with ${skillLabel.toLowerCase()} focus.`;
            } else {
                tipEl.textContent = `You’re ${remaining} minutes from the weekly goal. Focus on ${skillLabel.toLowerCase()} today.`;
            }
        }
    };

    const refreshInsights = async () => {
        const [events, recs] = await Promise.all([
            loadEvents(),
            getLearningRecommendations(),
        ]);
        const weekMinutes = formatMinutes(computeWeekMinutes(events));
        const weeklyTarget = getWeeklyGoalTarget();
        const weekPercent = updateWeeklyGoal(weekMinutes, weeklyTarget);
        updateRecommendations(recs, { weekPercent, weekMinutes, weeklyTarget });
    };

    metronomeBtn?.addEventListener('click', () => {
        const bpm = Number.parseInt(metronomeBtn.dataset.metronomeBpm || '0', 10);
        if (!Number.isFinite(bpm) || bpm <= 0) return;
        setJSON(METRONOME_PRESET_KEY, {
            bpm,
            expiresAt: Date.now() + METRONOME_PRESET_TTL,
        });
        document.dispatchEvent(new CustomEvent('panda:metronome-set', { detail: { bpm } }));
    });

    refreshInsights();

    document.addEventListener('panda:practice-recorded', refreshInsights);
    document.addEventListener('panda:game-recorded', refreshInsights);
    document.addEventListener('panda:song-recorded', refreshInsights);
    document.addEventListener('panda:weekly-goal-change', refreshInsights);
    document.addEventListener('panda:goal-target-change', refreshInsights);
    document.addEventListener('panda:ml-update', refreshInsights);
    document.addEventListener('panda:ml-reset', refreshInsights);
    document.addEventListener('panda:ml-recs', refreshInsights);
}
