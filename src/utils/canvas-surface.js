/**
 * Creates a simple canvas surface descriptor.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D | null, width: number, height: number }}
 */
export const createCanvasSurface = (canvas) => ({
    canvas,
    ctx: canvas.getContext('2d', { alpha: false, desynchronized: true }),
    width: canvas.width,
    height: canvas.height,
});
