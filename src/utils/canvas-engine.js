import { createCanvasSurface, resizeCanvasSurface } from './canvas-surface.js';
import { cancelAnimationFrameId } from './animation-frame-utils.js';

export class BaseCanvasEngine {
    constructor(canvas) {
        Object.assign(this, createCanvasSurface(canvas));
        this.isRunning = false;
        this.lastTime = performance.now();
        this.particles = [];
        this.rafId = null;
        this.canvasListenerCleanups = [];

        // Setup base resize handling
        this.handleResize = this.handleResize.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.loop = this.loop.bind(this);
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        this.handleResize();
    }

    addCanvasListener(type, handler, options) {
        if (!this.canvas || !type || typeof handler !== 'function') return () => { };
        this.canvas.addEventListener(type, handler, options);
        const cleanup = () => {
            this.canvas.removeEventListener(type, handler, options);
        };
        this.canvasListenerCleanups.push(cleanup);
        return cleanup;
    }

    bindCanvasPointerDown(handler, options) {
        return this.addCanvasListener('pointerdown', handler, options);
    }

    bindCanvasPointerDownMethod(methodName = 'handlePointerDown', options) {
        const handler = this?.[methodName];
        if (typeof handler !== 'function') return () => { };
        const boundHandler = handler.bind(this);
        this[methodName] = boundHandler;
        return this.bindCanvasPointerDown(boundHandler, options);
    }

    handleResize() {
        resizeCanvasSurface(this);
    }

    fillBackground(color) {
        if (!this.ctx) return;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop();
    }

    cancelScheduledFrame() {
        cancelAnimationFrameId(this);
    }

    scheduleNextFrame() {
        if (this.rafId !== null) return;
        this.rafId = requestAnimationFrame(this.loop);
    }

    stop() {
        this.isRunning = false;
        this.cancelScheduledFrame();
    }

    isPageHidden() {
        return document.visibilityState === 'hidden';
    }

    skipFrameIfHidden(onHidden) {
        if (!this.isPageHidden()) return false;
        if (typeof onHidden === 'function') onHidden();
        return true;
    }

    handleVisibilityChange() {
        if (!this.isRunning) return;

        if (this.skipFrameIfHidden(() => this.cancelScheduledFrame())) return;

        if (this.rafId === null) {
            this.lastTime = performance.now();
            this.scheduleNextFrame();
        }
    }

    loop() {
        if (!this.isRunning) return;
        if (this.skipFrameIfHidden(() => {
            this.rafId = null;
        })) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta to prevent huge jumps
        this.lastTime = now;

        // Delegate to child implementation
        if (this.update) this.update(dt);
        if (this.draw) this.draw();

        this.rafId = null;
        this.scheduleNextFrame();
    }

    destroy() {
        this.stop();
        while (this.canvasListenerCleanups.length) {
            const cleanup = this.canvasListenerCleanups.pop();
            cleanup?.();
        }
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
}
