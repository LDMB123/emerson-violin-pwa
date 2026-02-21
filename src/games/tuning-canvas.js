export class TuningCanvasEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.width = canvas.width;
        this.height = canvas.height;

        this.isRunning = false;
        this.lastTime = 0;

        // State
        this.targetString = null;
        this.currentCents = 0;
        this.energy = 0; // 0.0 to 1.0 continuously

        this.particles = [];
        this.wavePhase = 0;

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

    setTarget(target) {
        this.targetString = target;
        this.energy = 0;
    }

    updatePitch(cents, targetMatches) {
        if (!targetMatches) {
            this.currentCents += (Math.random() * 100 - this.currentCents) * 0.1;
            return;
        }
        // Smooth transition
        this.currentCents += (cents - this.currentCents) * 0.2;
    }

    setEnergy(energyRatio) {
        this.energy = Math.max(0, Math.min(1, energyRatio));
    }

    spawnSparkles(amount) {
        for (let i = 0; i < amount; i++) {
            this.particles.push({
                x: this.width / 2,
                y: this.height / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                color: Math.random() > 0.5 ? '#ffffff' : '#00ffff'
            });
        }
    }

    render(time) {
        if (!this.isRunning) return;
        requestAnimationFrame(this.render);

        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        const ctx = this.ctx;

        // Fade background (motion blur effect)
        ctx.fillStyle = 'rgba(15, 20, 35, 0.4)';
        ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;

        // Draw baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(this.width, cy);
        ctx.stroke();

        if (this.targetString) {
            // Calculate pointer X based on cents (-50 to +50 range)
            const maxDisplacement = cx * 0.8;
            const clampedCents = Math.max(-50, Math.min(50, this.currentCents));
            const pointerX = cx + (clampedCents / 50) * maxDisplacement;

            // Draw Target Center
            const targetColor = this.energy > 0.9 ? '#00ffaa' : '#ffaa00';
            ctx.shadowBlur = 20 + this.energy * 30;
            ctx.shadowColor = targetColor;

            ctx.fillStyle = targetColor;
            ctx.beginPath();
            ctx.arc(cx, cy, 15 + this.energy * 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw animated fluid waveform connecting pointer to center
            this.wavePhase += dt * (5 + this.energy * 20);

            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + this.energy * 0.5})`;
            ctx.lineWidth = 4 + this.energy * 6;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(pointerX, cy);

            // Generate sine wave path between pointer and center
            const dist = cx - pointerX;
            const segments = 20;
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const wx = pointerX + dist * t;
                const amp = Math.sin(t * Math.PI) * 40 * (1.0 - this.energy); // Flattens out as energy increases
                const wy = cy + Math.sin(this.wavePhase + t * Math.PI * 4) * amp;
                ctx.lineTo(wx, wy);
            }
            ctx.stroke();

            // Draw the pitch cursor
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pointerX, cy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
            ctx.beginPath();
            ctx.arc(pointerX, cy, 20, 0, Math.PI * 2);
            ctx.fill();

            if (this.energy > 0) {
                // Spawn resting particles based on energy
                if (Math.random() < this.energy) {
                    this.particles.push({
                        x: cx + (Math.random() - 0.5) * 40,
                        y: cy + (Math.random() - 0.5) * 40,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -2 - Math.random() * 3,
                        life: 1.0,
                        color: targetColor
                    });
                }
            }
        }

        // Render Particles
        ctx.globalCompositeOperation = 'screen';
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.life -= dt * 2.0; // half second life
            if (pt.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            pt.x += pt.vx;
            pt.y += pt.vy;

            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(1, 4 * pt.life), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
