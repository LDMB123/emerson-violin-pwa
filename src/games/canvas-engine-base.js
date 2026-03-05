import { createCanvasSurface } from '../utils/canvas-surface.js';

export class BaseCanvasEngine {
    constructor(canvas) {
        const surface = createCanvasSurface(canvas);
        Object.assign(this, surface);
        this.particles = [];
        this.lastTime = 0;
        this.isRunning = false;
        this.rafId = null;
        this.visibilityListenerBound = false;

        this.render = this.render.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    start() {
        if (this.isRunning === true) return;
        this.lastTime = performance.now();
        this.isRunning = true;
        this.bindVisibilityListener();
        this.scheduleRender();
    }

    scheduleRender() {
        if (!this.isRunning) return;
        if (this.rafId !== null) return;
        if (this.isPageHidden()) return;
        this.rafId = requestAnimationFrame(this.render);
    }

    cancelScheduledRender() {
        if (this.rafId === null) return;
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
    }

    isPageHidden() {
        return document.visibilityState === 'hidden';
    }

    bindVisibilityListener() {
        if (this.visibilityListenerBound) return;
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        this.visibilityListenerBound = true;
    }

    unbindVisibilityListener() {
        if (!this.visibilityListenerBound) return;
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.visibilityListenerBound = false;
    }

    handleVisibilityChange() {
        if (!this.isRunning) return;
        if (this.isPageHidden()) {
            this.cancelScheduledRender();
            return;
        }
        this.lastTime = performance.now();
        this.scheduleRender();
    }

    stop() {
        this.isRunning = false;
        this.cancelScheduledRender();
        this.unbindVisibilityListener();
        if (this.cleanupEvents) {
            this.cleanupEvents();
            this.cleanupEvents = null;
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        // If alpha is false, we must fill a background color dynamically or let subclasses do it
    }

    handleResize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.ctx.scale(dpr, dpr);
        // Normalize logical width/height for subclasses
        this.width = rect.width;
        this.height = rect.height;
    }

    beginFrame(time) {
        if (!this.isRunning) return null;
        if (this.isPageHidden()) {
            this.cancelScheduledRender();
            return null;
        }
        this.rafId = null;
        this.scheduleRender();
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        return { dt, ctx: this.ctx };
    }

    beginFilledFrame(time, fillStyle) {
        const frame = this.beginFrame(time);
        if (!frame) return null;
        const { ctx } = frame;
        ctx.fillStyle = fillStyle;
        ctx.fillRect(0, 0, this.width, this.height);
        return frame;
    }

    fillCircle(ctx, x, y, radius) {
        const fullArc = Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, fullArc);
        ctx.fill();
    }

    fillBackgroundAndGetCenter(ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.width, this.height);
        return {
            centerX: this.width / 2,
            centerY: this.height / 2,
        };
    }

    forEachLiveParticle({
        dt,
        lifeDecay = 1,
        update = null,
        draw = null,
    } = {}) {
        if (!Number.isFinite(dt) || dt <= 0) return;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life -= dt * lifeDecay;
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            if (typeof update === 'function') {
                update(particle, i);
            }
            if (typeof draw === 'function') {
                draw(particle, i);
            }
        }
    }

    render(_time) {
        // To be overridden by subclasses
        if (!this.isRunning) return;
        this.rafId = null;
        this.scheduleRender();
    }
}
