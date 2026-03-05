import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseCanvasEngine } from '../../src/utils/canvas-engine.js';

const setVisibility = (value) => {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value,
    });
};

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
    let rafCallbacks;
    let nextRafId;
    let engines;

    const runNextFrame = (time = performance.now()) => {
        const entries = [...rafCallbacks.entries()];
        rafCallbacks.clear();
        entries.forEach(([, callback]) => callback(time));
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
        setVisibility('visible');
        rafCallbacks = new Map();
        nextRafId = 1;
        engines = [];

        globalThis.requestAnimationFrame = vi.fn((callback) => {
            const id = nextRafId++;
            rafCallbacks.set(id, callback);
            return id;
        });
        globalThis.cancelAnimationFrame = vi.fn((id) => {
            rafCallbacks.delete(id);
        });
    });

    afterEach(() => {
        engines.forEach((engine) => engine.destroy());
        vi.restoreAllMocks();
        delete globalThis.requestAnimationFrame;
        delete globalThis.cancelAnimationFrame;
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

        setVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);

        setVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
        runNextFrame(1016);
        expect(engine.drawCount).toBe(2);
    });

    it('removes listeners and stops scheduling after destroy', () => {
        const engine = createStartedEngine();
        engine.destroy();

        const rafCallsBefore = requestAnimationFrame.mock.calls.length;
        setVisibility('visible');
        document.dispatchEvent(new Event('visibilitychange'));

        expect(requestAnimationFrame.mock.calls.length).toBe(rafCallsBefore);
    });
});
