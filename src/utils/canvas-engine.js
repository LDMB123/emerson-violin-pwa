export class BaseCanvasEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = canvas.width;
        this.height = canvas.height;
        this.isRunning = false;
        this.lastTime = performance.now();
        this.particles = [];

        // Setup base resize handling
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
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
    }

    loop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta to prevent huge jumps
        this.lastTime = now;

        // Delegate to child implementation
        if (this.update) this.update(dt);
        if (this.draw) this.draw();

        requestAnimationFrame(() => this.loop());
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
    }
}
