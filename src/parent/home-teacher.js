import {
    MISSION_UPDATED,
    ML_UPDATE,
    ML_RESET,
    ML_RECS,
} from '../utils/event-names.js';
import { getLearningRecommendations } from '../ml/recommendations.js';
import { isParentUnlocked } from './pin-state.js';
import { PARENT_UNLOCK_KEY } from '../persistence/storage-keys.js';
import { createQueuedAsyncRunner } from '../utils/queued-async-runner.js';

let container = null;
let focusTitleEl = null;
let checklistEl = null;
let completeBtn = null;
let statusEl = null;

let bound = false;
const refreshEvents = [ML_UPDATE, ML_RESET, ML_RECS, MISSION_UPDATED];

const resolveElements = () => {
    container = document.querySelector('[data-parent-home-teacher]');
    if (!container) return;

    focusTitleEl = container.querySelector('[data-ht-focus-title]');
    checklistEl = container.querySelector('[data-ht-checklist]');
    completeBtn = container.querySelector('[data-ht-complete]');
    statusEl = container.querySelector('[data-ht-status]');
};

const handleSessionComplete = () => {
    if (!checklistEl) return;

    // Animate or provide feedback that the parent completed the check
    const checkboxes = Array.from(checklistEl.querySelectorAll('input[type="checkbox"]'));
    const allChecked = checkboxes.every(cb => cb.checked);

    if (statusEl) {
        if (allChecked) {
            statusEl.textContent = 'Excellent! You just logged a highly effective practice session.';
            statusEl.style.color = 'var(--accent-color)';
        } else {
            statusEl.textContent = 'Coaching session logged. Try to hit all checklist items tomorrow!';
            statusEl.style.color = 'var(--text-color)';
        }
    }

    if (completeBtn) {
        completeBtn.textContent = 'Session Complete ✓';
        completeBtn.disabled = true;
    }
};

const runRefreshTeacherDashboard = async () => {
    resolveElements();
    if (!container?.isConnected) return;
    if (!isParentUnlocked(PARENT_UNLOCK_KEY)) return;

    try {
        const recs = await getLearningRecommendations();
        if (!recs) return;

        // 1. Update Title
        if (focusTitleEl) {
            focusTitleEl.textContent = `Today's Focus: ${recs.skillLabel || 'General Practice'}`;
        }

        // 2. Hydrate Checklist dynamically based on the weakest skill
        if (checklistEl && recs.coachCue) {
            // We know recommendations-plan.js generates a specific coachCue based on the weakest skill
            checklistEl.innerHTML = `
                <li><label><input type="checkbox"> <span>${recs.coachCue}</span></label></li>
                <li><label><input type="checkbox"> <span>Is the posture tall with "Jelly Shoulders"?</span></label></li>
                <li><label><input type="checkbox"> <span>Is the bow grip soft ("Bunny Hands")?</span></label></li>
            `;
        }

        // 3. Reset Button State
        if (completeBtn) {
            completeBtn.textContent = 'Log Coaching Session';
            completeBtn.disabled = false;
        }
        if (statusEl) {
            statusEl.textContent = '';
        }

    } catch (err) {
        console.warn('Failed to refresh Home Teacher dashboard:', err);
    }
};

const refreshTeacherDashboard = createQueuedAsyncRunner(runRefreshTeacherDashboard);

const bindListeners = () => {
    const alreadyBound = bound === true;
    if (alreadyBound) return;
    bound = true;

    refreshEvents.forEach((eventName) => {
        document.addEventListener(eventName, refreshTeacherDashboard);
    });

    // Use event delegation for the complete button
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-ht-complete]')) {
            handleSessionComplete();
        }
    });

    // Refresh when the PIN is unlocked successfully
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#view-parent') {
            setTimeout(refreshTeacherDashboard, 150);
        }
    });

};

export const init = () => {
    resolveElements();
    bindListeners();
    // Delay initialization slightly to ensure the PIN dialog handles its CSS layout first
    setTimeout(refreshTeacherDashboard, 50);
};
