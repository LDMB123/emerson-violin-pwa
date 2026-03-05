import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseCanvasEngine } from '../../src/games/canvas-engine-base.js';

describe('games/canvas-engine-base BaseCanvasEngine', () => {
    let nextRafId;
    let rafCallbacks;

    const createEngine = () => {
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
        canvas.width = 160;
        canvas.height = 90;

        const ctx = {
            clearRect: vi.fn(),
            scale: vi.fn(),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            fillStyle: '#000',
        };
        canvas.getContext = vi.fn(() => ctx);
        parent.appendChild(canvas);
        document.body.appendChild(parent);

        const engine = new BaseCanvasEngine(canvas);
        return { engine, canvas, ctx };
    };

    beforeEach(() => {
        nextRafId = 1;
        rafCallbacks = new Map();

        Object.defineProperty(window, 'devicePixelRatio', {
            configurable: true,
            value: 1,
        });

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
        vi.restoreAllMocks();
        document.body.innerHTML = '';
        delete globalThis.requestAnimationFrame;
        delete globalThis.cancelAnimationFrame;
    });

    it('starts once and cancels the scheduled frame when stopped', () => {
        const { engine } = createEngine();

        engine.start();
        const firstRafId = engine.rafId;

        expect(engine.isRunning).toBe(true);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

        engine.start();
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

        const cleanupEvents = vi.fn();
        engine.cleanupEvents = cleanupEvents;
        engine.stop();

        expect(cancelAnimationFrame).toHaveBeenCalledWith(firstRafId);
        expect(cleanupEvents).toHaveBeenCalledTimes(1);
        expect(engine.cleanupEvents).toBeNull();
        expect(engine.rafId).toBeNull();
        expect(engine.isRunning).toBe(false);
    });

    it('clears the canvas with current dimensions', () => {
        const { engine, ctx } = createEngine();

        engine.clear();
        expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 160, 90);
    });

    it('resizes canvas and normalizes logical dimensions', () => {
        const { engine, canvas, ctx } = createEngine();

        Object.defineProperty(window, 'devicePixelRatio', {
            configurable: true,
            value: 2,
        });

        engine.handleResize();

        expect(canvas.width).toBe(640);
        expect(canvas.height).toBe(360);
        expect(engine.width).toBe(320);
        expect(engine.height).toBe(180);
        expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    });

    it('returns null frame when not running and caps delta time when running', () => {
        const { engine, ctx } = createEngine();

        expect(engine.beginFrame(50)).toBeNull();
        expect(requestAnimationFrame).toHaveBeenCalledTimes(0);

        engine.isRunning = true;
        engine.lastTime = 0;

        const frame = engine.beginFrame(500);
        expect(frame).toEqual({ dt: 0.1, ctx });
        expect(engine.lastTime).toBe(500);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('fills frame background and returns frame payload', () => {
        const { engine, ctx } = createEngine();

        engine.isRunning = true;
        engine.lastTime = 100;
        const frame = engine.beginFilledFrame(150, '#123456');

        expect(frame?.dt).toBeCloseTo(0.05);
        expect(ctx.fillStyle).toBe('#123456');
        expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 160, 90);
    });

    it('draw helpers render expected shapes and centers', () => {
        const { engine, ctx } = createEngine();

        engine.fillCircle(ctx, 10, 20, 5);
        expect(ctx.beginPath).toHaveBeenCalledTimes(1);
        expect(ctx.arc).toHaveBeenCalledWith(10, 20, 5, 0, Math.PI * 2);
        expect(ctx.fill).toHaveBeenCalledTimes(1);

        const center = engine.fillBackgroundAndGetCenter(ctx, '#ff0000');
        expect(ctx.fillStyle).toBe('#ff0000');
        expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 160, 90);
        expect(center).toEqual({ centerX: 80, centerY: 45 });
    });

    it('updates and draws only live particles', () => {
        const { engine } = createEngine();
        const update = vi.fn();
        const draw = vi.fn();

        engine.particles = [
            { id: 'stays', life: 0.3 },
            { id: 'removed', life: 0.01 },
        ];

        engine.forEachLiveParticle({ dt: 0.1, lifeDecay: 1, update, draw });

        expect(engine.particles).toHaveLength(1);
        expect(engine.particles[0].id).toBe('stays');
        expect(update).toHaveBeenCalledTimes(1);
        expect(draw).toHaveBeenCalledTimes(1);

        engine.forEachLiveParticle({ dt: 0, update, draw });
        expect(update).toHaveBeenCalledTimes(1);
        expect(draw).toHaveBeenCalledTimes(1);
    });

    it('render only schedules another frame when running', () => {
        const { engine } = createEngine();

        engine.render(100);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(0);

        engine.isRunning = true;
        engine.render(101);
        expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
        expect(engine.rafId).toBe(1);
    });
});
