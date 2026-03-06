import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EchoGameCanvasEngine } from '../../src/games/echo-canvas.js';

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
    canvas.getContext = vi.fn(() => ctx);
    parent.appendChild(canvas);
    document.body.appendChild(parent);

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
