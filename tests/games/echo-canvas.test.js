import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EchoGameCanvasEngine } from '../../src/games/echo-canvas.js';
import { attachCanvasWithContext, createParentWithRect } from './canvas-test-helpers.js';

const createEngine = () => {
    const parent = createParentWithRect();

    const ctx = {
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        setTransform: vi.fn(),
        lineCap: 'butt',
        lineJoin: 'miter',
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        globalAlpha: 1,
    };
    const canvas = attachCanvasWithContext(parent, ctx);

    return { engine: new EchoGameCanvasEngine(canvas), ctx };
};

describe('EchoGameCanvasEngine', () => {
    const engines = [];

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        while (engines.length) {
            engines.pop()?.destroy();
        }
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('redraws when state updates', () => {
        const { engine } = createEngine();
        engines.push(engine);
        const drawSpy = vi.spyOn(engine, 'draw');

        engine.updateState({
            phase: 'teacher_playing',
            teacherBuffer: new Float32Array([0.2, 0.8, 0.2]),
            playheadPosition: 0.5,
        });

        expect(drawSpy).toHaveBeenCalledTimes(1);
    });
});
