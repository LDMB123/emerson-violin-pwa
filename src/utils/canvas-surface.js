const CONTEXT_OPTIONS = { alpha: false, desynchronized: true };
const FALLBACK_WIDTH = 300;
const FALLBACK_HEIGHT = 150;

const resolvePositiveDimension = (...values) => {
    for (const value of values) {
        if (Number.isFinite(value) && value > 0) {
            return value;
        }
    }
    return 0;
};

const resolveCanvasDimensions = (canvas, surface = null) => {
    const rect = typeof canvas?.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
    const parentRect = typeof canvas?.parentElement?.getBoundingClientRect === 'function'
        ? canvas.parentElement.getBoundingClientRect()
        : null;

    const width = resolvePositiveDimension(
        rect?.width,
        canvas?.clientWidth,
        parentRect?.width,
        canvas?.parentElement?.clientWidth,
        surface?.width,
        canvas?.width,
        FALLBACK_WIDTH,
    );

    const height = resolvePositiveDimension(
        rect?.height,
        canvas?.clientHeight,
        parentRect?.height,
        canvas?.parentElement?.clientHeight,
        surface?.height,
        canvas?.height,
        FALLBACK_HEIGHT,
    );

    return { width, height };
};

const applyCanvasScale = (ctx, pixelRatio) => {
    if (!ctx) return;
    if (typeof ctx.setTransform === 'function') {
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        return;
    }
    if (typeof ctx.resetTransform === 'function') {
        ctx.resetTransform();
    }
    if (typeof ctx.scale === 'function') {
        ctx.scale(pixelRatio, pixelRatio);
    }
};

/**
 * Sizes a canvas backing store to its displayed dimensions and normalizes the
 * drawing context so callers can keep using logical CSS pixels.
 *
 * @param {{ canvas: HTMLCanvasElement, ctx?: CanvasRenderingContext2D | null, width?: number, height?: number, pixelRatio?: number } | HTMLCanvasElement} surfaceOrCanvas
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null, width: number, height: number, pixelRatio: number } | null}
 */
export const resizeCanvasSurface = (surfaceOrCanvas) => {
    const isCanvasElement = typeof HTMLCanvasElement !== 'undefined'
        && surfaceOrCanvas instanceof HTMLCanvasElement;
    const surface = isCanvasElement
        ? { canvas: surfaceOrCanvas, ctx: null }
        : surfaceOrCanvas;

    const canvas = surface?.canvas || null;
    if (!canvas) return null;

    const ctx = surface.ctx || canvas.getContext('2d', CONTEXT_OPTIONS);
    const { width, height } = resolveCanvasDimensions(canvas, surface);
    const devicePixelRatio = Number(globalThis.devicePixelRatio || 1);
    const pixelRatio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * pixelRatio));

    if (canvas.width !== pixelWidth) {
        canvas.width = pixelWidth;
    }
    if (canvas.height !== pixelHeight) {
        canvas.height = pixelHeight;
    }

    applyCanvasScale(ctx, pixelRatio);

    surface.ctx = ctx;
    surface.width = width;
    surface.height = height;
    surface.pixelRatio = pixelRatio;
    return surface;
};

/**
 * Creates a simple canvas surface descriptor.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null, width: number, height: number, pixelRatio: number } | null}
 */
export const createCanvasSurface = (canvas) => {
    if (!canvas) return null;
    return resizeCanvasSurface({
        canvas,
        ctx: canvas.getContext('2d', CONTEXT_OPTIONS),
        width: canvas.width,
        height: canvas.height,
        pixelRatio: 1,
    });
};
