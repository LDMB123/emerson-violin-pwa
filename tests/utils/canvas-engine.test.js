import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseCanvasEngine } from '../../src/utils/canvas-engine.js';
import {
    installRafMocks,
    setDocumentVisibility,
} from './test-lifecycle-mocks.js';

class TestCanvasEngine extends BaseCanvasEngine {
    constructor(canvas) {
        super(canvas);
        this.updates = [];
        this.drawCount = 0;
    }

    update(dt) {
        this.updates.push(dt);
    }

    draw() {
        this.drawCount += 1;
    }
}

describe('utils/canvas-engine BaseCanvasEngine', () => {
    let rafMocks;
    let engines;

    const runNextFrame = (time = performance.now()) => {
        rafMocks.runQueuedFrames(time);
    };

    const createStartedEngine = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 100;
        canvas.getContext = vi.fn(() => ({ clearRect: vi.fn() }));
        const engine = new TestCanvasEngine(canvas);
        engines.push(engine);
        engine.start();
        return engine;
    };

    beforeEach(() => {
        setDocumentVisibility('visible');
        rafMocks = installRafMocks();
        engines = [];
    });

    afterEach(() => {
        engines.forEach((engine) => engine.destroy());
        vi.restoreAllMocks();
        rafMocks.teardown();
    });

    it('starts loop and calls update/draw each frame', () => {
        const engine = createStartedEngine();

        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
        runNextFrame(1000);

        expect(engine.updates.length).toBe(2);
        expect(engine.drawCount).toBe(2);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    });

    it('pauses frames while hidden and resumes when visible again', () => {
        const engine = createStartedEngine();

        setDocumentVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);

        setDocumentVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
        runNextFrame(1016);
        expect(engine.drawCount).toBe(2);
    });

    it('removes listeners and stops scheduling after destroy', () => {
        const engine = createStartedEngine();
        engine.destroy();

        const rafCallsBefore = requestAnimationFrame.mock.calls.length;
        setDocumentVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(requestAnimationFrame.mock.calls.length).toBe(rafCallsBefore);
    });

    it('cleans up canvas listeners registered via base helper', () => {
        const engine = createStartedEngine();
        const onPointerDown = vi.fn();
        engine.bindCanvasPointerDown(onPointerDown);

        engine.canvas.dispatchEvent(new Event('pointerdown'));
        expect(onPointerDown).toHaveBeenCalledTimes(1);

        engine.destroy();
        engine.canvas.dispatchEvent(new Event('pointerdown'));
        expect(onPointerDown).toHaveBeenCalledTimes(1);
    });

    it('sizes the canvas backing store to the displayed dimensions', () => {
        const parent = document.createElement('div');
        parent.getBoundingClientRect = vi.fn(() => ({
            width: 320,
            height: 180,
            top: 0,
            left: 0,
            right: 320,
            bottom: 180,
        }));

        const canvas = document.createElement('canvas');
        const ctx = {
            clearRect: vi.fn(),
            scale: vi.fn(),
        };
        canvas.getContext = vi.fn(() => ctx);
        parent.appendChild(canvas);
        document.body.appendChild(parent);

        Object.defineProperty(window, 'devicePixelRatio', {
            configurable: true,
            value: 2,
        });

        const engine = new TestCanvasEngine(canvas);
        engines.push(engine);

        expect(canvas.width).toBe(640);
        expect(canvas.height).toBe(360);
        expect(engine.width).toBe(320);
        expect(engine.height).toBe(180);
        expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    });
});
