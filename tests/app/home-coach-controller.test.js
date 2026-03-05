import { describe, expect, it, vi } from 'vitest';
import {
    GAME_RECORDED,
    LESSON_COMPLETE,
    LESSON_STEP,
    RT_SESSION_STARTED,
} from '../../src/utils/event-names.js';

const recommendationMocks = vi.hoisted(() => ({
    getLearningRecommendations: vi.fn(async () => ({
        recommendedGameId: 'bow-hero',
    })),
}));

vi.mock('../../src/ml/recommendations.js', () => recommendationMocks);

import { createHomeCoachController } from '../../src/app/home-coach-controller.js';

describe('app/home-coach-controller', () => {
    const flush = async () => {
        await Promise.resolve();
        await Promise.resolve();
    };

    const createController = (toMissionCheckpointHref = () => null) => createHomeCoachController({
        getViewId: (href = '') => href.replace(/^#/, ''),
        getRouteMeta: (viewId) => {
            if (viewId.startsWith('view-game-')) return { navGroup: 'games' };
            if (viewId.startsWith('view-song-')) return { navGroup: 'songs' };
            return { navGroup: 'practice' };
        },
        toMissionCheckpointHref,
    });

    it('binds home actions and updates continue link from recommendations', async () => {
        document.body.innerHTML = `
            <section>
                <a data-start-practice href="#view-home">Start</a>
                <a data-continue-practice href="#view-home">Continue</a>
            </section>
        `;
        document.documentElement.dataset.practiceContinueHref = 'view-tuner';

        const controller = createController();
        const container = document.querySelector('section');
        const startBtn = container.querySelector('[data-start-practice]');
        const continueBtn = container.querySelector('[data-continue-practice]');

        controller.bindChildHomeActions(container);
        expect(startBtn.dataset.bound).toBe('true');
        expect(continueBtn.getAttribute('href')).toBe('#view-tuner');
        expect(continueBtn.textContent).toBe('Resume Tuner');

        startBtn.click();
        expect(window.location.hash).toBe('#view-coach');

        await flush();
        expect(continueBtn.getAttribute('href')).toBe('#view-tuner');
    });

    it('updates continue checkpoint when mission checkpoint href is available', () => {
        const controller = createController(() => '#view-mission-checkpoint');
        controller.updatePracticeContinueCheckpoint('view-coach');
        expect(document.documentElement.dataset.practiceContinueHref).toBe('#view-mission-checkpoint');
    });

    it('binds coach stepper tabs/cards and reacts to coaching lifecycle events', () => {
        window.location.hash = '#view-coach';
        document.body.innerHTML = `
            <section>
                <button data-coach-step-target="warmup" class="is-active">Warmup</button>
                <button data-coach-step-target="play">Play</button>
                <article data-coach-step-card="warmup"></article>
                <article data-coach-step-card="play"></article>
            </section>
        `;
        const controller = createController();
        const container = document.querySelector('section');
        const [warmupTab, playTab] = container.querySelectorAll('[data-coach-step-target]');
        const [warmupCard, playCard] = container.querySelectorAll('[data-coach-step-card]');

        controller.bindCoachStepper(container);
        expect(warmupCard.hidden).toBe(false);
        expect(playCard.hidden).toBe(true);

        playTab.click();
        expect(playCard.hidden).toBe(false);
        expect(warmupCard.hidden).toBe(true);

        document.dispatchEvent(new Event(RT_SESSION_STARTED));
        expect(warmupTab.classList.contains('is-active')).toBe(true);

        document.dispatchEvent(new CustomEvent(LESSON_STEP, { detail: { state: 'complete' } }));
        expect(playTab.classList.contains('is-active')).toBe(true);

        document.dispatchEvent(new Event(LESSON_COMPLETE));
        expect(playTab.classList.contains('is-active')).toBe(true);

        document.dispatchEvent(new Event(GAME_RECORDED));
        expect(playTab.classList.contains('is-active')).toBe(true);
    });
});
