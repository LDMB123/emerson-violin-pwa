import { createCanvasSurface } from '../utils/canvas-surface.js';

export class BaseCanvasEngine {
    constructor(canvas) {
        Object.assign(this, createCanvasSurface(canvas));

        this.particles = [];
        this.isRunning = false;
        this.lastTime = 0;

        this.render = this.render.bind(this);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.render);
    }

    stop() {
        this.isRunning = false;
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
        requestAnimationFrame(this.render);
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
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
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
        requestAnimationFrame(this.render);
    }
}
