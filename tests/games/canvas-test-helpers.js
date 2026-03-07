import { vi } from 'vitest';
import { expect } from 'vitest';

export const createParentWithRect = ({ width = 320, height = 180 } = {}) => {
    const parent = document.createElement('div');
    parent.getBoundingClientRect = vi.fn(() => ({
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
    }));
    document.body.appendChild(parent);
    return parent;
};

export const attachCanvasWithContext = (parent, context) => {
    const canvas = document.createElement('canvas');
    canvas.getContext = vi.fn(() => context);
    parent.appendChild(canvas);
    return canvas;
};

export const expectScaledCanvasDimensions = ({ canvas, engine, ctx, width = 320, height = 180, dpr = 2 }) => {
    expect(canvas.width).toBe(width * dpr);
    expect(canvas.height).toBe(height * dpr);
    expect(engine.width).toBe(width);
    expect(engine.height).toBe(height);
    expect(ctx.scale).toHaveBeenCalledWith(dpr, dpr);
};
