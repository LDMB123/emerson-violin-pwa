import { updateParticles, drawGlowingParticles } from '../utils/canvas-utils.js';
import { BaseCanvasEngine } from '../utils/canvas-engine.js';

export class BowHeroCanvasEngine extends BaseCanvasEngine {
    constructor(canvas) {
        super(canvas);
        this.onStroke = null;

        // Bow state
        this.bowPosition = -this.width / 2; // Starts offscreen left
        this.targetBowPosition = this.bowPosition;
        this.isMovingRight = true;
        this.bowLength = 250;
        this.bowVelocity = 0;
        this.glowIntensity = 0;
    }

    reset() {
        this.particles = [];
        this.bowPosition = -this.width / 2;
        this.targetBowPosition = this.bowPosition;
        this.isMovingRight = true;
        this.bowVelocity = 0;
        this.glowIntensity = 0;
    }

    triggerStroke() {
        // Swap direction and calculate new target position across the canvas
        if (this.isMovingRight) {
            this.targetBowPosition = this.width - this.bowLength / 2;
        } else {
            this.targetBowPosition = this.bowLength / 2;
        }
        this.isMovingRight = !this.isMovingRight;
        this.glowIntensity = 1.0; // Flash full brightness

        if (this.onStroke) this.onStroke();
    }

    emitParticles(x, y, dx) {
        // Emit sparkling rosin particles trailing the bow stroke
        const count = 3 + Math.random() * 5;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() * 20 - 10),
                y: y + (Math.random() * 60 - 30),
                vx: -dx * 0.2 + (Math.random() * 2 - 1), // Drift opposite to bow movement
                vy: Math.random() * 2 - 1,
                radius: 1 + Math.random() * 3,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.04,
                color: Math.random() > 0.5 ? '#fff' : '#00e5ff'
            });
        }
    }

    update(dt) {
        // Physics for bow movement (spring smoothing)
        const prevPosition = this.bowPosition;
        this.bowPosition += (this.targetBowPosition - this.bowPosition) * 12 * dt;
        this.bowVelocity = (this.bowPosition - prevPosition) / dt;

        // Emit particles if moving fast enough
        if (Math.abs(this.bowVelocity) > 50) {
            const centerX = this.bowPosition;
            const centerY = this.height / 2;
            // Emit from the contact point (approximate middle of the bow)
            this.emitParticles(centerX, centerY, this.bowVelocity > 0 ? 1 : -1);
        }

        // Decay glow
        this.glowIntensity = Math.max(0, this.glowIntensity - 2 * dt);

        // Update particles
        updateParticles(this.particles);
    }

    draw() {
        this.ctx.fillStyle = '#1a1a2e'; // Deep space blue/purple
        this.ctx.fillRect(0, 0, this.width, this.height);

        const cy = this.height / 2;

        // Draw Violin Strings (Background)
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.lineWidth = 4;
        for (let i = -1.5; i <= 1.5; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, cy + i * 20);
            this.ctx.lineTo(this.width, cy + i * 20);
            this.ctx.stroke();
        }
        this.ctx.restore();

        // Draw Target Zone (Center Pulse)
        this.ctx.save();
        const pulseRatio = 0.5 + 0.5 * Math.sin(performance.now() / 300);
        this.ctx.fillStyle = `rgba(0, 229, 255, ${0.1 + this.glowIntensity * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(this.width / 2, cy, 60 + pulseRatio * 10, 0, Math.PI * 2);
        this.ctx.fill();

        // Target outline
        this.ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 + this.glowIntensity * 0.6})`;
        this.ctx.lineWidth = 2 + this.glowIntensity * 3;
        this.ctx.stroke();
        this.ctx.restore();

        // Draw Bow
        this.ctx.save();
        this.ctx.translate(this.bowPosition, cy);

        // Bow shadow
        this.ctx.shadowColor = `rgba(0, 229, 255, ${this.glowIntensity})`;
        this.ctx.shadowBlur = 30;

        // Bow stick (Wood/Carbon)
        this.ctx.fillStyle = '#bcaaa4';
        this.ctx.beginPath();
        this.ctx.roundRect(-this.bowLength / 2, -15, this.bowLength, 8, 4);
        this.ctx.fill();

        // Bow hair
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.roundRect(-this.bowLength / 2 + 10, 5, this.bowLength - 20, 4, 2);
        this.ctx.fill();

        // Contact point flare based on velocity and glow
        if (this.glowIntensity > 0.1) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity})`;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, 40 * this.glowIntensity, 20 * this.glowIntensity, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();

        // Draw Particles
        drawGlowingParticles(this.ctx, this.particles);
    }

    destroy() {
        super.destroy();
    }
}
