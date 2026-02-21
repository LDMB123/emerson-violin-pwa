import { clamp } from '../utils/math.js';
import { formatPitchQuestFeedback } from './pitch-quest-feedback.js';

export const applyPitchQuestLiveFeature = ({
    feature,
    targetNote,
    tolerance,
    stabilityStreak,
    lastStableAt,
    offsetEl,
    noteEl,
    gauge,
    bambooFillEl,
    stabilityEl,
    feedbackEl,
    markChecklist,
}) => {
    const cents = clamp(Math.round(feature.cents || 0), -50, 50);
    if (offsetEl) offsetEl.textContent = `${cents > 0 ? '+' : ''}${cents} cents`;
    if (noteEl) noteEl.textContent = feature.note || '--';
    if (gauge) gauge.style.setProperty('--pitch-offset', `${cents * 0.5}deg`);

    const inTune = Math.abs(cents) <= tolerance;
    const matchingNote = targetNote && (feature.note || '').startsWith(targetNote);
    let nextStabilityStreak = stabilityStreak;
    let nextLastStableAt = lastStableAt;

    if (inTune && matchingNote) {
        const now = Date.now();
        nextStabilityStreak = now - lastStableAt <= 1800 ? stabilityStreak + 1 : 1;
        nextLastStableAt = now;

        // Bamboo metaphor: fills up relative to the streak (max 5)
        const fillPct = Math.min(100, nextStabilityStreak * 20);
        if (bambooFillEl) {
            bambooFillEl.style.setProperty('--bamboo-fill', `${fillPct}%`);
        }

        if (nextStabilityStreak >= 5) {
            // Auto track the matching note level!
            const noteStepMap = { G: 'pq-step-1', D: 'pq-step-2', A: 'pq-step-3', E: 'pq-step-4' };
            markChecklist(noteStepMap[targetNote] || 'pq-step-5');
        }
    } else {
        nextStabilityStreak = 0;
        if (bambooFillEl) {
            bambooFillEl.style.setProperty('--bamboo-fill', '0%');
        }
    }

    if (stabilityEl) stabilityEl.textContent = `${nextStabilityStreak}x`;
    if (feedbackEl) {
        if (nextStabilityStreak >= 5) {
            feedbackEl.textContent = 'Bamboo caught! Try another level!';
        } else {
            feedbackEl.textContent = formatPitchQuestFeedback({
                hasSignal: feature.hasSignal,
                inTune,
                matchingNote,
                targetNote,
                cents,
            });
        }
    }

    return {
        stabilityStreak: nextStabilityStreak,
        lastStableAt: nextLastStableAt,
    };
};
