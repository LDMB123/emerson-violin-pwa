import { getLearningRecommendations } from '@core/ml/recommendations.js';
import { cloneTemplate } from '@core/utils/templates.js';
import { registerUiTicker } from '@core/utils/ticker.js';
import { getViewId, onViewChange } from '@core/utils/view-events.js';

const planPanel = document.querySelector('[data-lesson-plan="coach"]');
if (!planPanel) {
    // No coach lesson plan available in this view.
} else {
    const stepsList = planPanel.querySelector('[data-lesson-steps]');
    const planCta = planPanel.querySelector('[data-lesson="cta"]');
    const runnerTemplate = document.querySelector('#lesson-runner-template');

    const runner = cloneTemplate(runnerTemplate);
    const initRunner = () => {
        runner.dataset.lessonRunner = 'true';

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
        const startButton = runner.querySelector('[data-lesson-runner-start]');
        const nextButton = runner.querySelector('[data-lesson-runner-next]');
        const ctaButton = runner.querySelector('[data-lesson-runner-cta]');

        const formatTime = (seconds) => {
            const total = Math.max(0, Math.ceil(seconds));
            const minutes = Math.floor(total / 60);
            const remaining = total % 60;
            return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
        };

        const toLessonLink = (id) => {
            if (!id) return '#view-games';
            if (id.startsWith('view-')) return `#${id}`;
            return `#view-game-${id}`;
        };

        let steps = [];
        let currentIndex = 0;
        let completedSteps = 0;
        let remainingSeconds = 0;
        let stepEndsAt = null;
        let stopTicker = null;
        let recommendedGameId = 'view-games';
        let resumeOnVisible = false;
        const isCoachView = (explicit) => getViewId(explicit) === 'view-coach';

        const stopTimer = () => {
            if (stopTicker) {
                stopTicker();
                stopTicker = null;
            }
            stepEndsAt = null;
        };

        const updateProgress = () => {
            if (!steps.length) return;
            const step = steps[currentIndex];
            const duration = Math.max(30, Math.round((step?.minutes || 1) * 60));
            const stepProgress = stopTicker ? (duration - remainingSeconds) / duration : 0;
            const overall = Math.min(1, (completedSteps + stepProgress) / steps.length);
            const percent = Math.round(overall * 100);
            if (trackEl) {
                if ('value' in trackEl) {
                    trackEl.value = percent;
                    if (!trackEl.max) trackEl.max = 100;
                } else {
                    trackEl.setAttribute('aria-valuenow', String(percent));
                }
            }
        };

        const syncStepList = () => {
            if (!stepsList) return;
            const items = Array.from(stepsList.querySelectorAll('.lesson-step'));
            items.forEach((item, index) => {
                if (index < completedSteps) {
                    item.dataset.state = 'complete';
                } else if (index === currentIndex && completedSteps < steps.length) {
                    item.dataset.state = 'active';
                } else {
                    delete item.dataset.state;
                }
                if (index === currentIndex && completedSteps < steps.length) {
                    item.setAttribute('aria-current', 'step');
                } else {
                    item.removeAttribute('aria-current');
                }
            });
        };

        const dispatchLessonEvent = (state, step) => {
            document.dispatchEvent(new CustomEvent('panda:lesson-step', {
                detail: {
                    state,
                    step,
                    index: currentIndex,
                    total: steps.length,
                },
            }));
        };

        const setStatus = (message) => {
            if (statusEl) statusEl.textContent = message;
        };

        const updateStepDetails = () => {
            if (!steps.length) {
                if (stepEl) stepEl.textContent = 'No lesson plan yet';
                if (cueEl) cueEl.textContent = 'Practice a game to unlock a custom plan.';
                if (timerEl) timerEl.textContent = '00:00';
                if (ctaButton) ctaButton.setAttribute('href', '#view-games');
                if (startButton) startButton.disabled = true;
                if (nextButton) nextButton.disabled = true;
                return;
            }
            const step = steps[currentIndex];
            if (stepEl) {
                stepEl.textContent = `Step ${Math.min(currentIndex + 1, steps.length)} of ${steps.length}`;
            }
            if (cueEl) {
                cueEl.textContent = step?.label ? `${step.label}${step.cue ? ` · ${step.cue}` : ''}` : 'Tap Start to begin.';
            }
            if (ctaButton) {
                const ctaTarget = step?.cta || recommendedGameId;
                ctaButton.setAttribute('href', toLessonLink(ctaTarget));
                ctaButton.textContent = step?.ctaLabel || 'Open activity';
            }
            if (timerEl) {
                const duration = Math.max(30, Math.round((step?.minutes || 1) * 60));
                timerEl.textContent = formatTime(remainingSeconds || duration);
            }
            if (startButton) startButton.disabled = false;
            if (nextButton) nextButton.disabled = completedSteps >= steps.length;
            syncStepList();
            updateProgress();
        };

        const markGoalComplete = (step) => {
            if (!step?.id) return;
            const input = document.getElementById(step.id);
            if (!input || input.checked) return;
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const completeStep = ({ auto = false } = {}) => {
            if (!steps.length) return;
            const step = steps[currentIndex];
            stopTimer();
            remainingSeconds = 0;
            markGoalComplete(step);
            dispatchLessonEvent('complete', step);
            completedSteps = Math.min(steps.length, completedSteps + 1);
            if (completedSteps >= steps.length) {
                setStatus('Lesson complete! Awesome work.');
                if (startButton) startButton.textContent = 'Restart';
                if (nextButton) nextButton.disabled = true;
                if (ctaButton) ctaButton.setAttribute('href', '#view-games');
                document.dispatchEvent(new CustomEvent('panda:lesson-complete'));
            } else {
                currentIndex = completedSteps;
                setStatus(auto ? 'Step complete. Ready for the next one.' : 'Step marked complete. Tap Next to continue.');
                if (startButton) startButton.textContent = 'Start';
                if (nextButton) nextButton.disabled = false;
            }
            updateStepDetails();
        };

        const tick = () => {
            if (!stepEndsAt) return;
            remainingSeconds = Math.max(0, Math.ceil((stepEndsAt - Date.now()) / 1000));
            if (remainingSeconds <= 0) {
                completeStep({ auto: true });
                return;
            }
            if (timerEl) timerEl.textContent = formatTime(remainingSeconds);
            updateProgress();
        };

        const startStep = () => {
            if (!steps.length) return;
            if (completedSteps >= steps.length) {
                completedSteps = 0;
                currentIndex = 0;
            }
            const step = steps[currentIndex];
            const duration = Math.max(30, Math.round((step?.minutes || 1) * 60));
            if (!remainingSeconds || remainingSeconds > duration) {
                remainingSeconds = duration;
            }
            stopTimer();
            stepEndsAt = Date.now() + remainingSeconds * 1000;
            setStatus('Step in progress.');
            if (startButton) startButton.textContent = 'Pause';
            if (nextButton) nextButton.disabled = false;
            dispatchLessonEvent('start', step);
            stopTicker = registerUiTicker(tick);
            resumeOnVisible = false;
            if (timerEl) timerEl.textContent = formatTime(remainingSeconds);
            updateProgress();
        };

        const pauseStep = () => {
            if (!stopTicker) return;
            if (stepEndsAt) {
                remainingSeconds = Math.max(0, Math.ceil((stepEndsAt - Date.now()) / 1000));
            }
            stopTimer();
            setStatus('Paused. Tap Resume when ready.');
            if (startButton) startButton.textContent = 'Resume';
            if (nextButton) nextButton.disabled = false;
            resumeOnVisible = false;
            dispatchLessonEvent('pause', steps[currentIndex]);
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
            if (stopTicker) {
                pauseStep();
            } else {
                startStep();
            }
        };

        const handleNextClick = () => {
            if (!steps.length) return;
            if (stopTicker) {
                completeStep({ auto: false });
                return;
            }
            if (completedSteps >= steps.length) return;
            startStep();
        };

        if (startButton) startButton.addEventListener('click', handleStartClick);
        if (nextButton) nextButton.addEventListener('click', handleNextClick);

        const refreshPlan = async () => {
            const recs = await getLearningRecommendations();
            steps = Array.isArray(recs?.lessonSteps) ? recs.lessonSteps : [];
            recommendedGameId = recs?.recommendedGameId || recs?.recommendedGame || 'view-games';
            if (!steps.length) {
                completedSteps = 0;
                currentIndex = 0;
            } else if (currentIndex >= steps.length) {
                currentIndex = 0;
            }
            updateStepDetails();
        };

        refreshPlan();

        document.addEventListener('panda:ml-update', refreshPlan);
        document.addEventListener('panda:ml-reset', refreshPlan);
        document.addEventListener('panda:ml-recs', refreshPlan);

        if (stepsList) {
            const observer = new MutationObserver(() => {
                syncStepList();
            });
            observer.observe(stepsList, { childList: true, subtree: false });
        }

        const pauseIfInactive = () => {
            if (stopTicker) {
                pauseStep();
            }
            resumeOnVisible = false;
        };

        const pauseForHidden = () => {
            if (!stopTicker) return;
            if (stepEndsAt) {
                remainingSeconds = Math.max(0, Math.ceil((stepEndsAt - Date.now()) / 1000));
            }
            stopTimer();
            resumeOnVisible = true;
            setStatus('Paused while app is in the background.');
            if (startButton) startButton.textContent = 'Resume';
            if (nextButton) nextButton.disabled = false;
        };

        const resumeIfVisible = () => {
            if (!resumeOnVisible || document.hidden) return;
            if (!isCoachView()) {
                resumeOnVisible = false;
                return;
            }
            if (!steps.length || remainingSeconds <= 0 || stopTicker) {
                resumeOnVisible = false;
                return;
            }
            resumeOnVisible = false;
            setStatus('Step resumed.');
            stepEndsAt = Date.now() + remainingSeconds * 1000;
            stopTicker = registerUiTicker(tick);
        };

        onViewChange((viewId) => {
            if (!isCoachView(viewId)) {
                pauseIfInactive();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseForHidden();
                return;
            }
            resumeIfVisible();
        });

        window.addEventListener('pagehide', pauseIfInactive);
    };

    if (runner) {
        initRunner();
    }
}
