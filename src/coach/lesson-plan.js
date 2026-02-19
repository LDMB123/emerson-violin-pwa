import { getLearningRecommendations } from '../ml/recommendations.js';
import { formatTime } from '../games/session-timer.js';
import {
    LESSON_STEP,
    LESSON_COMPLETE,
    ML_UPDATE,
    ML_RESET,
    ML_RECS,
    MISSION_UPDATED,
    PRACTICE_STEP_STARTED,
    PRACTICE_STEP_COMPLETED,
} from '../utils/event-names.js';
import {
    toLessonLink,
    computeStepDuration,
    computeStepProgress,
    computeOverallProgress,
    formatStepLabel,
    formatStepCue,
} from '../utils/lesson-plan-utils.js';

let teardown = () => {};

const createRunnerMarkup = () => {
    const runner = document.createElement('div');
    runner.className = 'lesson-runner';
    runner.dataset.lessonRunner = 'true';
    runner.innerHTML = `
        <div class="lesson-runner-header">
            <span class="lesson-runner-title">Guided Lesson</span>
            <span class="lesson-runner-status" data-lesson-runner-status>Ready</span>
        </div>
        <div class="lesson-runner-body">
            <div class="lesson-runner-step" data-lesson-runner-step>Step 1 of 1</div>
            <div class="lesson-runner-cue" data-lesson-runner-cue>Tap Start to begin the first step.</div>
        </div>
        <div class="lesson-runner-timer" data-lesson-runner-timer>00:00</div>
        <div class="lesson-runner-progress" data-lesson-runner-track role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <span class="lesson-runner-fill" data-lesson-runner-fill style="width:0%"></span>
        </div>
        <div class="lesson-runner-actions">
            <button class="btn btn-primary" type="button" data-lesson-runner-start>Start</button>
            <button class="btn btn-secondary" type="button" data-lesson-runner-next disabled>Next step</button>
            <a class="btn btn-ghost" data-lesson-runner-cta href="#view-games">Open activity</a>
        </div>
    `;
    return runner;
};

const toRunnerStep = (step, index) => ({
    id: step?.id || `runner-step-${index + 1}`,
    label: step?.label || `Practice step ${index + 1}`,
    cue: step?.cue || '',
    cta: step?.cta || step?.target || 'view-games',
    ctaLabel: step?.ctaLabel || 'Open activity',
    minutes: Math.max(1, Math.round(step?.minutes || 3)),
    status: step?.status || 'not_started',
    source: step?.source || 'plan',
});

const setupLessonPlan = () => {
    const planPanel = document.querySelector('[data-lesson-plan="coach"]');
    if (!planPanel) return () => {};

    const existingRunner = planPanel.querySelector('[data-lesson-runner]');
    if (existingRunner) existingRunner.remove();

    const stepsList = planPanel.querySelector('[data-lesson-steps]');
    const planCta = planPanel.querySelector('[data-lesson="cta"]');
    const runner = createRunnerMarkup();

    if (planCta) {
        planPanel.insertBefore(runner, planCta);
    } else {
        planPanel.appendChild(runner);
    }

    const statusEl = runner.querySelector('[data-lesson-runner-status]');
    const stepEl = runner.querySelector('[data-lesson-runner-step]');
    const cueEl = runner.querySelector('[data-lesson-runner-cue]');
    const timerEl = runner.querySelector('[data-lesson-runner-timer]');
    const trackEl = runner.querySelector('[data-lesson-runner-track]');
    const fillEl = runner.querySelector('[data-lesson-runner-fill]');
    const startButton = runner.querySelector('[data-lesson-runner-start]');
    const nextButton = runner.querySelector('[data-lesson-runner-next]');
    const ctaButton = runner.querySelector('[data-lesson-runner-cta]');

    let steps = [];
    let currentIndex = 0;
    let completedSteps = 0;
    let remainingSeconds = 0;
    let timerId = null;
    let recommendedGameId = 'view-games';

    const stopTimer = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    };

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const setRunnerCta = (href, label = 'Open activity') => {
        if (!ctaButton) return;
        ctaButton.setAttribute('href', href);
        ctaButton.textContent = label;
    };

    const getCurrentStep = () => steps[currentIndex] || null;

    const updateProgress = () => {
        if (!steps.length) return;
        const step = getCurrentStep();
        const duration = computeStepDuration(step?.minutes);
        const stepProgress = computeStepProgress(duration, remainingSeconds, !!timerId);
        const overall = computeOverallProgress(completedSteps, stepProgress, steps.length);
        const percent = Math.round(overall * 100);
        if (fillEl) fillEl.style.width = `${percent}%`;
        if (trackEl) trackEl.setAttribute('aria-valuenow', String(percent));
    };

    const syncStepList = () => {
        if (!stepsList) return;
        const items = Array.from(stepsList.querySelectorAll('.lesson-step'));
        items.forEach((item, index) => {
            const step = steps[index];
            const complete = step?.status === 'complete' || index < completedSteps;
            const active = step?.id === getCurrentStep()?.id;
            item.classList.toggle('is-complete', complete);
            item.classList.toggle('is-active', active);
            item.classList.toggle('is-remediation', step?.source === 'remediation');
            if (active) {
                item.setAttribute('aria-current', 'step');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    };

    const markGoalComplete = (step) => {
        if (!step?.id) return;
        const input = document.getElementById(step.id)
            || document.querySelector(`#view-coach [data-goal-list] input[data-step-id="${step.id}"]`);
        if (!(input instanceof HTMLInputElement)) return;
        if (input.checked) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const dispatchLessonEvent = (state, step) => {
        document.dispatchEvent(new CustomEvent(LESSON_STEP, {
            detail: {
                state,
                step,
                index: currentIndex,
                total: steps.length,
            },
        }));
    };

    const dispatchPracticeEvent = (eventName, step) => {
        document.dispatchEvent(new CustomEvent(eventName, {
            detail: {
                step,
                index: currentIndex,
                total: steps.length,
                missionStepId: step?.id || null,
                timestamp: Date.now(),
            },
        }));
    };

    const renderEmptyStep = () => {
        if (stepEl) stepEl.textContent = formatStepLabel(0, 0);
        if (cueEl) cueEl.textContent = 'Practice a game to unlock a custom plan.';
        if (timerEl) timerEl.textContent = '00:00';
        setRunnerCta('#view-games');
        if (startButton) startButton.disabled = true;
        if (nextButton) nextButton.disabled = true;
        updateProgress();
    };

    const renderCurrentStep = (step) => {
        if (!step) {
            renderEmptyStep();
            return;
        }
        if (stepEl) stepEl.textContent = formatStepLabel(currentIndex, steps.length);
        if (cueEl) cueEl.textContent = formatStepCue(step);
        const ctaTarget = step?.cta || recommendedGameId;
        setRunnerCta(toLessonLink(ctaTarget), step?.ctaLabel || 'Open activity');
        if (timerEl) {
            const duration = computeStepDuration(step?.minutes);
            timerEl.textContent = formatTime((remainingSeconds || duration) * 1000);
        }
        if (startButton) startButton.disabled = false;
        if (nextButton) nextButton.disabled = completedSteps >= steps.length;
    };

    const updateStepDetails = () => {
        if (!steps.length) {
            renderEmptyStep();
            return;
        }
        renderCurrentStep(getCurrentStep());
        syncStepList();
        updateProgress();
    };

    const recalculateCompletion = () => {
        completedSteps = steps.filter((step) => step.status === 'complete').length;
        const current = steps.find((step) => step.status === 'in_progress')
            || steps.find((step) => step.status === 'not_started')
            || steps[Math.max(0, steps.length - 1)]
            || null;
        currentIndex = current ? Math.max(0, steps.findIndex((step) => step.id === current.id)) : 0;
    };

    const completeStep = ({ auto = false } = {}) => {
        const step = getCurrentStep();
        if (!step) return;

        stopTimer();
        remainingSeconds = 0;
        markGoalComplete(step);

        steps = steps.map((entry) => entry.id === step.id
            ? { ...entry, status: 'complete', completedAt: Date.now() }
            : entry);

        dispatchLessonEvent('complete', step);
        dispatchPracticeEvent(PRACTICE_STEP_COMPLETED, step);

        recalculateCompletion();

        if (completedSteps >= steps.length) {
            setStatus('Lesson complete! Awesome work.');
            if (startButton) startButton.textContent = 'Restart';
            if (nextButton) nextButton.disabled = true;
            if (ctaButton) ctaButton.setAttribute('href', '#view-games');
            document.dispatchEvent(new CustomEvent(LESSON_COMPLETE));
        } else {
            setStatus(auto ? 'Step complete. Ready for the next one.' : 'Step marked complete. Tap Next to continue.');
            if (startButton) startButton.textContent = 'Start';
            if (nextButton) nextButton.disabled = false;
        }
        updateStepDetails();
    };

    const tick = () => {
        if (remainingSeconds <= 0) {
            completeStep({ auto: true });
            return;
        }
        remainingSeconds -= 1;
        if (timerEl) timerEl.textContent = formatTime(remainingSeconds * 1000);
        updateProgress();
    };

    const startStep = () => {
        if (!steps.length) return;
        if (completedSteps >= steps.length) {
            steps = steps.map((step) => ({
                ...step,
                status: 'not_started',
                startedAt: null,
                completedAt: null,
            }));
            recalculateCompletion();
        }

        const step = getCurrentStep();
        if (!step) return;

        const duration = computeStepDuration(step?.minutes);
        if (!remainingSeconds || remainingSeconds > duration) {
            remainingSeconds = duration;
        }

        steps = steps.map((entry) => {
            if (entry.id === step.id) {
                return {
                    ...entry,
                    status: 'in_progress',
                    startedAt: Date.now(),
                };
            }
            if (entry.status === 'in_progress') {
                return {
                    ...entry,
                    status: 'not_started',
                };
            }
            return entry;
        });

        stopTimer();
        setStatus('Step in progress.');
        if (startButton) startButton.textContent = 'Pause';
        if (nextButton) nextButton.disabled = false;
        dispatchLessonEvent('start', step);
        dispatchPracticeEvent(PRACTICE_STEP_STARTED, step);
        timerId = window.setInterval(tick, 1000);
        if (timerEl) timerEl.textContent = formatTime(remainingSeconds * 1000);
        updateProgress();
        syncStepList();
    };

    const pauseStep = () => {
        if (!timerId) return;
        stopTimer();
        setStatus('Paused. Tap Resume when ready.');
        if (startButton) startButton.textContent = 'Resume';
        if (nextButton) nextButton.disabled = false;
        dispatchLessonEvent('pause', getCurrentStep());
    };

    const handleStartClick = () => {
        if (!steps.length) return;
        if (completedSteps >= steps.length) {
            completedSteps = 0;
            currentIndex = 0;
            remainingSeconds = 0;
            setStatus('Lesson restarted.');
            updateStepDetails();
            startStep();
            return;
        }
        if (timerId) {
            pauseStep();
        } else {
            startStep();
        }
    };

    const handleNextClick = () => {
        if (!steps.length) return;
        if (timerId) {
            completeStep({ auto: false });
            return;
        }
        if (completedSteps >= steps.length) return;
        startStep();
    };

    const fromMissionSteps = (missionSteps = []) => missionSteps.map(toRunnerStep);

    const fromLessonSteps = (lessonSteps = []) => lessonSteps.map((step, index) => ({
        id: step?.id || `lesson-step-${index + 1}`,
        label: step?.label || `Practice step ${index + 1}`,
        cue: step?.cue || '',
        cta: step?.cta || recommendedGameId,
        ctaLabel: step?.ctaLabel || 'Open activity',
        minutes: Math.max(1, Math.round(step?.minutes || 3)),
        status: 'not_started',
        source: 'plan',
    }));

    const refreshPlan = async ({ externalMission = null } = {}) => {
        const recs = await getLearningRecommendations();
        recommendedGameId = recs?.recommendedGameId || recs?.recommendedGame || 'view-games';

        const missionSteps = externalMission?.steps || recs?.mission?.steps;
        if (Array.isArray(missionSteps) && missionSteps.length) {
            steps = fromMissionSteps(missionSteps);
        } else {
            steps = fromLessonSteps(recs?.lessonSteps || []);
        }

        recalculateCompletion();
        updateStepDetails();
    };

    startButton?.addEventListener('click', handleStartClick);
    nextButton?.addEventListener('click', handleNextClick);

    refreshPlan();

    const onMlUpdate = () => refreshPlan();
    const onMlReset = () => refreshPlan();
    const onMlRecs = () => refreshPlan();
    const onMissionUpdated = (event) => {
        refreshPlan({ externalMission: event?.detail?.mission }).catch(() => {});
    };

    document.addEventListener(ML_UPDATE, onMlUpdate);
    document.addEventListener(ML_RESET, onMlReset);
    document.addEventListener(ML_RECS, onMlRecs);
    document.addEventListener(MISSION_UPDATED, onMissionUpdated);

    let observer = null;
    if (stepsList) {
        observer = new MutationObserver(() => {
            syncStepList();
        });
        observer.observe(stepsList, { childList: true, subtree: false });
    }

    const onHashChange = () => {
        if (window.location.hash !== '#view-coach') {
            stopTimer();
            if (startButton) startButton.textContent = 'Start';
        }
    };
    const onVisibility = () => {
        if (document.hidden) {
            pauseStep();
        }
    };

    window.addEventListener('hashchange', onHashChange, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        stopTimer();
        observer?.disconnect();
        startButton?.removeEventListener('click', handleStartClick);
        nextButton?.removeEventListener('click', handleNextClick);
        document.removeEventListener(ML_UPDATE, onMlUpdate);
        document.removeEventListener(ML_RESET, onMlReset);
        document.removeEventListener(ML_RECS, onMlRecs);
        document.removeEventListener(MISSION_UPDATED, onMissionUpdated);
        window.removeEventListener('hashchange', onHashChange);
        document.removeEventListener('visibilitychange', onVisibility);
    };
};

const initLessonPlan = () => {
    teardown();
    teardown = setupLessonPlan();
};

export const init = initLessonPlan;
