import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { setDifficultyBadge } from '../games/shared.js';
import {
    createTrainerDrillBaseController,
    calculatePostureAccuracy,
    calculatePostureScore,
    formatPostureHint,
    reportTrainerGameResult,
} from './trainer-utils.js';

export const createPostureDrillController = () => {
    let postureInput = null;
    let posturePreview = null;
    let postureImage = null;
    let postureClear = null;
    let postureHint = null;

    let postureCount = 0;
    let postureTarget = 2;
    let postureReported = false;
    let postureUrl = null;

    const setElements = (elements = {}) => {
        postureInput = elements.postureInput || null;
        posturePreview = elements.posturePreview || null;
        postureImage = elements.postureImage || null;
        postureClear = elements.postureClear || null;
        postureHint = elements.postureHint || null;
    };

    const updatePostureHint = () => {
        if (!postureHint) return;
        postureHint.textContent = formatPostureHint(postureCount, postureTarget);
    };

    const reportPosture = () => {
        if (postureReported || postureCount === 0) return;
        postureReported = true;
        const accuracy = calculatePostureAccuracy(postureCount, postureTarget);
        const score = calculatePostureScore(postureCount);
        reportTrainerGameResult(updateGameResult, 'trainer-posture', accuracy, score);
    };

    const clearPosturePreview = () => {
        if (postureUrl) {
            URL.revokeObjectURL(postureUrl);
            postureUrl = null;
        }
        if (postureImage) {
            postureImage.removeAttribute('src');
        }
        if (posturePreview) {
            posturePreview.hidden = true;
        }
        if (postureInput) {
            postureInput.value = '';
        }
    };

    const bindControls = () => {
        if (postureInput && postureInput.dataset.postureBound !== 'true') {
            postureInput.dataset.postureBound = 'true';
            postureInput.addEventListener('change', () => {
                const file = postureInput.files?.[0];
                if (!file) {
                    clearPosturePreview();
                    return;
                }

                clearPosturePreview();
                postureUrl = URL.createObjectURL(file);
                if (postureImage) {
                    postureImage.src = postureUrl;
                }
                if (posturePreview) {
                    posturePreview.hidden = false;
                }
                postureCount += 1;
                postureReported = false;
                updatePostureHint();
            });
        }

        if (postureClear && postureClear.dataset.postureBound !== 'true') {
            postureClear.dataset.postureBound = 'true';
            postureClear.addEventListener('click', () => {
                clearPosturePreview();
                reportPosture();
            });
        }
    };

    const applyTuning = async () => {
        const { targetChecks, difficulty } = await getGameTuning('trainer-posture');
        if (Number.isFinite(targetChecks)) {
            postureTarget = targetChecks;
        }
        setDifficultyBadge(document.querySelector('#view-posture .view-header'), difficulty, 'Posture');
        updatePostureHint();
    };

    const refreshTuningState = () => {
        void applyTuning();
        postureReported = false;
    };

    return {
        ...createTrainerDrillBaseController({
            syncUi: updatePostureHint,
            refreshTuningState,
            bindControls,
            setElements,
        }),
        handlePagehide() {
            reportPosture();
            clearPosturePreview();
        },
        handleHashChange(hash) {
            if (hash !== '#view-posture') {
                reportPosture();
                clearPosturePreview();
            }
        },
    };
};
