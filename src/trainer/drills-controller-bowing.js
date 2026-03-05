import { updateGameResult, getGameTuning } from '../ml/adaptive-engine.js';
import { setDifficultyBadge } from '../games/shared.js';
import {
    calculateBowingAccuracy,
    calculateBowingScore,
    createTrainerDrillBaseController,
    formatBowingIntroText,
    reportTrainerGameResult,
} from './trainer-utils.js';

export const createBowingDrillController = () => {
    let bowingIntro = null;
    let bowingChecks = [];
    let bowingTarget = 3;
    let bowingReported = false;

    const setElements = (elements = {}) => {
        bowingIntro = elements.bowingIntro || null;
        bowingChecks = Array.isArray(elements.bowingChecks) ? elements.bowingChecks : [];
    };

    const updateBowingIntro = () => {
        if (!bowingIntro) return;
        const base = bowingIntro.dataset.baseText || bowingIntro.textContent || '';
        if (!bowingIntro.dataset.baseText) {
            bowingIntro.dataset.baseText = base;
        }
        bowingIntro.textContent = formatBowingIntroText(base, bowingTarget);
    };

    const reportBowing = () => {
        if (bowingReported || !bowingChecks.length) return;
        const completed = bowingChecks.filter((input) => input.checked).length;
        if (!completed) return;

        bowingReported = true;
        const accuracy = calculateBowingAccuracy(completed, bowingTarget);
        const score = calculateBowingScore(completed);
        reportTrainerGameResult(updateGameResult, 'bowing-coach', accuracy, score);
    };

    const bindControls = () => {
        bowingChecks.forEach((input) => {
            if (input.dataset.bowingBound === 'true') return;
            input.dataset.bowingBound = 'true';
            input.addEventListener('change', () => {
                bowingReported = false;
                updateBowingIntro();
                const completed = bowingChecks.filter((item) => item.checked).length;
                if (completed >= bowingTarget) {
                    reportBowing();
                }
            });
        });
    };

    async function applyTuning() {
        const bowingTuning = await getGameTuning('bowing-coach');
        bowingTarget = bowingTuning.targetSets ?? bowingTarget;
        setDifficultyBadge(document.querySelector('#view-bowing .view-header'), bowingTuning.difficulty, 'Bowing');
        updateBowingIntro();
    }

    const refreshTuningState = () => {
        bowingReported = false;
        void applyTuning();
    };

    return {
        ...createTrainerDrillBaseController({
            setElements,
            bindControls,
            syncUi: updateBowingIntro,
            refreshTuningState,
        }),
        handleHashChange(hash) {
            if (hash !== '#view-bowing') {
                reportBowing();
            }
        },
    };
};
