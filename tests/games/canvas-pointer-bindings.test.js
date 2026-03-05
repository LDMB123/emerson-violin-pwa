import { describe, expect, it, vi } from 'vitest';
import { bindCanvasPointerDrag, bindRunningCanvasPointerDrag } from '../../src/games/canvas-pointer-bindings.js';

describe('games/canvas-pointer-bindings', () => {
    it('wires pointer drag lifecycle and passes mapped client coordinates', () => {
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);

        const onStart = vi.fn();
        const onMove = vi.fn();
        const onEnd = vi.fn();
        let tracking = false;

        const cleanup = bindCanvasPointerDrag({
            canvas,
            canStart: () => true,
            isTracking: () => tracking,
            onStart: () => {
                tracking = true;
                onStart();
            },
            onMove,
            onEnd: () => {
                tracking = false;
                onEnd();
            },
        });

        canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 120, clientY: 35 }));
        expect(onStart).toHaveBeenCalledTimes(1);
        expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ clientX: 120, clientY: 35 }));

        canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 160, clientY: 40 }));
        expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ clientX: 160, clientY: 40 }));

        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        expect(onEnd).toHaveBeenCalledTimes(1);

        cleanup();
        canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 50 }));

        expect(onMove).toHaveBeenCalledTimes(2);
    });

    it('ignores move events when tracking guard is false', () => {
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const onMove = vi.fn();

        const cleanup = bindCanvasPointerDrag({
            canvas,
            canStart: () => false,
            isTracking: () => false,
            onMove,
        });

        canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 80, clientY: 12 }));
        canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 80, clientY: 12 }));

        expect(onMove).toHaveBeenCalledTimes(0);
        cleanup();
    });

    it('uses engine canvas and running state via bindRunningCanvasPointerDrag', () => {
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        const onMove = vi.fn();
        const engine = { canvas, isRunning: false };
        let tracking = false;

        const cleanup = bindRunningCanvasPointerDrag({
            engine,
            isTracking: () => tracking,
            onStart: () => {
                tracking = true;
            },
            onMove,
            onEnd: () => {
                tracking = false;
            },
        });

        canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 32, clientY: 18 }));
        expect(onMove).toHaveBeenCalledTimes(0);

        engine.isRunning = true;
        canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 64, clientY: 24 }));
        expect(onMove).toHaveBeenCalledWith(expect.objectContaining({ clientX: 64, clientY: 24 }));

        cleanup();
    });
});
