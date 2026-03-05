import { describe, expect, it, vi } from 'vitest';
import { bindGameStartStop } from '../../src/games/game-start-stop-bindings.js';

const createEngineMock = ({ isRunning = false } = {}) => {
    const engine = {
        isRunning,
        start: vi.fn(() => {
            engine.isRunning = true;
        }),
        stop: vi.fn(() => {
            engine.isRunning = false;
        }),
    };
    return engine;
};

describe('games/game-start-stop-bindings', () => {
    it('starts and stops engine through start button with proper labels', () => {
        const button = document.createElement('button');
        const engine = createEngineMock();
        const resetBeforeStart = vi.fn();
        const onStop = vi.fn();

        const cleanup = bindGameStartStop({
            startButton: button,
            engine,
            startLabel: 'Start Game',
            stopLabel: 'Stop Game',
            resetBeforeStart,
            onStop,
            isGameViewActive: () => true,
        });

        button.click();
        expect(resetBeforeStart).toHaveBeenCalledTimes(1);
        expect(engine.start).toHaveBeenCalledTimes(1);
        expect(button.textContent).toBe('Stop Game');

        button.click();
        expect(engine.stop).toHaveBeenCalledTimes(1);
        expect(onStop).toHaveBeenCalledTimes(1);
        expect(button.textContent).toBe('Start Game');

        cleanup();
    });

    it('auto-stops on hash change when the view is no longer active', () => {
        const button = document.createElement('button');
        const engine = createEngineMock({ isRunning: true });
        const onViewExit = vi.fn();

        bindGameStartStop({
            startButton: button,
            engine,
            startLabel: 'Start',
            stopLabel: 'Stop',
            isGameViewActive: () => false,
            onViewExit,
        });

        window.dispatchEvent(new HashChangeEvent('hashchange'));

        expect(engine.stop).toHaveBeenCalledTimes(1);
        expect(button.textContent).toBe('Start');
        expect(onViewExit).toHaveBeenCalledTimes(1);
    });

    it('cleanup detaches listeners', () => {
        const button = document.createElement('button');
        const engine = createEngineMock();
        const cleanup = bindGameStartStop({
            startButton: button,
            engine,
            startLabel: 'Start',
            stopLabel: 'Stop',
            isGameViewActive: () => true,
        });

        cleanup();
        button.click();

        expect(engine.start).toHaveBeenCalledTimes(0);
    });
});
