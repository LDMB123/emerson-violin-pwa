import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installRafMocks } from '../utils/test-lifecycle-mocks.js';

const sharedMocks = vi.hoisted(() => {
    const instances = [];
    const EchoGameCanvasEngine = vi.fn(function MockEchoGameCanvasEngine() {
        this.resetGame = vi.fn();
        this.updateState = vi.fn();
        this.destroy = vi.fn();
        instances.push(this);
    });

    return {
        instances,
        EchoGameCanvasEngine,
        postAudioMessage: vi.fn(),
    };
});

vi.mock('../../src/games/echo-canvas.js', () => ({
    EchoGameCanvasEngine: sharedMocks.EchoGameCanvasEngine,
}));

vi.mock('../../src/realtime/session-controller.js', () => ({
    postAudioMessage: sharedMocks.postAudioMessage,
}));

import { dispose, init } from '../../src/games/echo.js';

const mountEchoView = () => {
    document.body.innerHTML = `
        <section id="view-game-echo">
            <div data-echo="curtain" style="display: flex;">
                <button data-echo="start" type="button">Start Listening</button>
            </div>
            <canvas id="echo-canvas"></canvas>
        </section>
    `;
};

describe('echo async flow', () => {
    let rafMocks;

    beforeEach(() => {
        sharedMocks.instances.length = 0;
        sharedMocks.EchoGameCanvasEngine.mockClear();
        sharedMocks.postAudioMessage.mockClear();
        vi.restoreAllMocks();
        vi.useFakeTimers();
        rafMocks = installRafMocks();
        mountEchoView();
    });

    afterEach(() => {
        dispose();
        document.body.innerHTML = '';
        vi.useRealTimers();
        rafMocks.teardown();
        vi.restoreAllMocks();
    });

    it('restores the start button when sequence startup throws', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        init();
        const [instance] = sharedMocks.instances;
        instance.updateState.mockImplementation(() => {
            throw new Error('boom');
        });

        const startButton = document.querySelector('[data-echo="start"]');
        startButton.click();

        await vi.advanceTimersByTimeAsync(500);
        await Promise.resolve();

        expect(errorSpy).toHaveBeenCalledWith('[Echo] failed to start sequence', expect.any(Error));
        expect(startButton.disabled).toBe(false);
        expect(startButton.textContent).toBe('Play Again');
        expect(document.querySelector('[data-echo="curtain"]').style.display).toBe('flex');
    });

    it('cancels delayed startup when the view is disposed and rebound', async () => {
        init();
        const firstStartButton = document.querySelector('[data-echo="start"]');
        firstStartButton.click();

        dispose();
        mountEchoView();
        init();

        const secondInstance = sharedMocks.instances.at(-1);

        await vi.advanceTimersByTimeAsync(500);
        await Promise.resolve();

        expect(secondInstance.resetGame).not.toHaveBeenCalled();
        expect(secondInstance.updateState).not.toHaveBeenCalled();
    });

    it('cancels the in-flight playhead frame on dispose', async () => {
        init();
        const [instance] = sharedMocks.instances;
        const startButton = document.querySelector('[data-echo="start"]');
        startButton.click();

        await vi.advanceTimersByTimeAsync(500);

        expect(instance.resetGame).toHaveBeenCalledTimes(1);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

        dispose();

        expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    });
});
