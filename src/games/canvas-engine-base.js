export class BaseCanvasEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.width = canvas.width;
        this.height = canvas.height;

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

    render(_time) {
        // To be overridden by subclasses
        if (!this.isRunning) return;
        requestAnimationFrame(this.render);
    }
}
