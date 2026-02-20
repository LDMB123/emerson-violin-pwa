import { GAME_OBJECTIVE_TIERS } from './game-config.js';
import { formatMinutes, createSessionTimer } from './session-timer.js';

export const OBJECTIVE_LABELS = Object.freeze({
    foundation: 'Foundation',
    core: 'Core',
    mastery: 'Mastery',
});

export const resetGameView = (view, { forceEvents = false } = {}) => {
    if (!view) return;
    const inputs = Array.from(view.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
    inputs.forEach((input) => {
        const nextChecked = input.defaultChecked ?? false;
        const changed = input.checked !== nextChecked;
        if (changed) {
            input.checked = nextChecked;
        }
        if (forceEvents || changed) {
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    const liveKeys = ['liveScore', 'liveStars', 'liveCombo', 'liveMatches', 'liveCreativity'];
    view.querySelectorAll('[data-live-score], [data-live-stars], [data-live-combo], [data-live-matches], [data-live-creativity]').forEach((el) => {
        liveKeys.forEach((key) => delete el.dataset[key]);
    });
    view.querySelectorAll('[data-live]').forEach((el) => delete el.dataset.live);
};

export const attachSessionTimer = (view, timerEl, fillEl, trackEl, targetMinutes, scoreEl, announceEl) => {
    const timer = createSessionTimer({
        targetMinutes,
        onUpdate: ({ percent, complete, timeLabel }) => {
            if (timerEl) timerEl.textContent = timeLabel;
            if (fillEl) {
                fillEl.style.width = `${percent}%`;
                if (trackEl) trackEl.setAttribute('aria-valuenow', String(percent));
            }
            if (scoreEl) {
                scoreEl.textContent = complete ? 'Session Complete' : 'Session Active';
            }
        },
        onMilestone: (_id, message) => {
            if (announceEl) announceEl.textContent = message;
        },
    });

    const start = () => {
        view.dataset.session = 'active';
        if (announceEl) announceEl.textContent = 'Session started';
        timer.start();
    };

    const stop = () => {
        timer.stop();
        view.dataset.session = 'idle';
        if (scoreEl) scoreEl.textContent = scoreEl.dataset.defaultScore || 'Guided Drill';
    };

    const reset = () => {
        timer.reset();
        if (timerEl) timerEl.textContent = '00:00';
        if (announceEl) announceEl.textContent = '';
        if (fillEl) {
            fillEl.style.width = '0%';
            if (trackEl) trackEl.setAttribute('aria-valuenow', '0');
        }
    };

    return { start, stop, reset };
};

export const injectHeaderControls = (view) => {
    const header = view.querySelector('.game-header');
    if (!header) return null;
    const existingControls = header.querySelector('[data-game-controls]');
    const scoreEl = header.querySelector('.game-score');
    if (existingControls) {
        return {
            scoreEl,
            timerEl: existingControls.querySelector('[data-game-timer]'),
            resetButton: existingControls.querySelector('[data-game-reset]'),
        };
    }
    if (scoreEl && !scoreEl.dataset.defaultScore) {
        scoreEl.dataset.defaultScore = scoreEl.textContent || 'Guided Drill';
    }

    const controls = document.createElement('div');
    controls.className = 'game-header-actions';
    controls.dataset.gameControls = 'true';

    const timer = document.createElement('div');
    timer.className = 'game-timer';
    timer.textContent = '00:00';
    timer.dataset.gameTimer = 'true';

    const timerAnnounce = document.createElement('div');
    timerAnnounce.className = 'sr-only';
    timerAnnounce.setAttribute('aria-live', 'polite');
    timerAnnounce.dataset.gameTimerAnnounce = 'true';

    const resetButton = document.createElement('button');
    resetButton.className = 'icon-btn';
    resetButton.type = 'button';
    resetButton.textContent = '↺';
    resetButton.setAttribute('aria-label', 'Reset session');
    resetButton.dataset.gameReset = 'true';

    const coachButton = document.createElement('button');
    coachButton.className = 'icon-btn';
    coachButton.type = 'button';
    coachButton.textContent = '✨';
    coachButton.setAttribute('aria-label', 'Jump to coach plan');
    coachButton.dataset.gameCoachJump = 'true';

    controls.appendChild(timer);
    controls.appendChild(timerAnnounce);
    controls.appendChild(coachButton);
    controls.appendChild(resetButton);

    header.appendChild(controls);

    const panel = view.querySelector('[data-game-coach]');
    if (panel) {
        coachButton.addEventListener('click', () => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    return { scoreEl, timerEl: timer, announceEl: timerAnnounce, resetButton };
};

export const buildCoachPanel = (view, meta) => {
    const content = view.querySelector('.game-content');
    if (!content || content.querySelector('[data-game-coach]')) return null;

    const objectivePacks = meta.objectivePacks || {
        foundation: meta.steps || [],
        core: meta.steps || [],
        mastery: meta.steps || [],
    };
    const tierHtml = GAME_OBJECTIVE_TIERS.map((tierKey) => {
        const objectives = objectivePacks[tierKey] || [];
        const items = objectives.map((step) => (
            `<li>${step.label}${step.cue ? ` — ${step.cue}` : ''}</li>`
        )).join('');
        return `
            <div class="game-objective-tier" data-objective-tier="${tierKey}" data-tier-active="false">
                <div class="game-objective-tier-head">
                    <span>${OBJECTIVE_LABELS[tierKey]}</span>
                    <span>${objectives.length} objectives</span>
                </div>
                <ul>${items || '<li>No objectives configured.</li>'}</ul>
            </div>
        `;
    }).join('');

    const panel = document.createElement('div');
    panel.className = 'game-coach glass';
    panel.dataset.gameCoach = 'true';
    panel.innerHTML = `
        <div class="game-coach-header">
            <div class="game-coach-text">
                <span class="game-coach-kicker">Coach Focus</span>
                <h3>${meta.skill} · ${meta.goal}</h3>
                <p class="game-coach-goal">Target session: ${formatMinutes(meta.targetMinutes)}</p>
                <p class="game-coach-goal" data-game-mastery-status>Mastery tier: Foundation</p>
            </div>
            <div class="game-coach-badge">${meta.skill}</div>
        </div>
        <div class="game-objective-tiers">${tierHtml}</div>
        <div class="game-session">
            <div class="game-session-row">
                <span class="game-session-label">Session Timer</span>
                <span class="game-session-time" data-game-session-time="">00:00</span>
                <span class="game-session-target">/ ${formatMinutes(meta.targetMinutes)}</span>
            </div>
            <div class="game-session-track" data-game-session-track=""
                role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <span class="game-session-fill" data-game-session-fill="" style="width:0%"></span>
            </div>
            <div class="game-session-actions">
                <button class="btn btn-primary" type="button" data-game-session-start="">Start session</button>
                <button class="btn btn-secondary" type="button" data-game-session-stop="" disabled>Finish</button>
            </div>
        </div>
        <div class="game-coach-tip"><span>Coach tip:</span> ${meta.tip}</div>`;

    content.insertBefore(panel, content.firstChild);

    return panel;
};
