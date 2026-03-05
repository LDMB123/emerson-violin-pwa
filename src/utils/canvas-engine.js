import { createCanvasSurface } from './canvas-surface.js';

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
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
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
        // Core implementation relies on CSS scaling, 
        // children can override if they need internal resolution changes
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    handleVisibilityChange() {
        if (!this.isRunning) return;

        if (document.visibilityState === 'hidden') {
            if (this.rafId !== null) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            return;
        }

        if (this.rafId === null) {
            this.lastTime = performance.now();
            this.rafId = requestAnimationFrame(() => this.loop());
        }
    }

    loop() {
        if (!this.isRunning) return;
        if (document.visibilityState === 'hidden') {
            this.rafId = null;
            return;
        }

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta to prevent huge jumps
        this.lastTime = now;

        // Delegate to child implementation
        if (this.update) this.update(dt);
        if (this.draw) this.draw();

        this.rafId = requestAnimationFrame(() => this.loop());
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
