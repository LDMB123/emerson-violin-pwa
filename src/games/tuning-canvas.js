import { BaseCanvasEngine } from './canvas-engine-base.js';
import { atLeast1, clamp } from '../utils/math.js';

export class TuningCanvasEngine extends BaseCanvasEngine {
    constructor(canvas) {
        super(canvas);

        // State
        this.targetString = null;
        this.currentCents = 0;
        this.energy = 0; // 0.0 to 1.0 continuously
        this.wavePhase = 0;
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
        this.energy = clamp(energyRatio, 0, 1);
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
        const frame = this.beginFilledFrame(time, 'rgba(15, 20, 35, 0.4)');
        if (!frame) return;
        const { dt, ctx } = frame;

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
            const clampedCents = clamp(this.currentCents, -50, 50);
            const pointerX = cx + (clampedCents / 50) * maxDisplacement;

            // Draw Target Center
            const targetColor = this.energy > 0.9 ? '#00ffaa' : '#ffaa00';
            ctx.shadowBlur = 20 + this.energy * 30;
            ctx.shadowColor = targetColor;

            ctx.fillStyle = targetColor;
            this.fillCircle(ctx, cx, cy, 15 + this.energy * 10);
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
            this.fillCircle(ctx, pointerX, cy, 8);
            ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
            this.fillCircle(ctx, pointerX, cy, 20);

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
        this.forEachLiveParticle({
            dt,
            lifeDecay: 2.0, // half second life
            update: (pt) => {
                pt.x += pt.vx;
                pt.y += pt.vy;
            },
            draw: (pt) => {
                ctx.fillStyle = pt.color;
                ctx.globalAlpha = pt.life;
                this.fillCircle(ctx, pt.x, pt.y, atLeast1(4 * pt.life));
            },
        });
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
    }
}
