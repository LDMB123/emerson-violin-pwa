import { updateParticles, drawGlowingParticles } from '../utils/canvas-utils.js';
import { BaseCanvasEngine } from '../utils/canvas-engine.js';

export class StringQuestCanvasEngine extends BaseCanvasEngine {
    constructor(canvas, isHorizontal = true) {
        super(canvas);
        this.isHorizontal = isHorizontal;
        this.onStringPluck = null;

        // Define strings: G (thickest, lowest) to E (thinnest, highest)
        this.strings = [
            { id: 'G', color: '#ff4081', thickness: 8, yPos: 0.2, vibration: 0, targetVibration: 0, highlight: 0 },
            { id: 'D', color: '#ffb300', thickness: 6, yPos: 0.4, vibration: 0, targetVibration: 0, highlight: 0 },
            { id: 'A', color: '#00e5ff', thickness: 4, yPos: 0.6, vibration: 0, targetVibration: 0, highlight: 0 },
            { id: 'E', color: '#b2ff59', thickness: 2, yPos: 0.8, vibration: 0, targetVibration: 0, highlight: 0 }
        ];

        this.handlePointerDown = this.handlePointerDown.bind(this);
        canvas.addEventListener('pointerdown', this.handlePointerDown);
    }

    reset() {
        this.particles = [];
        this.strings.forEach(s => {
            s.vibration = 0;
            s.targetVibration = 0;
            s.highlight = 0;
        });
    }

    pluck(stringId) {
        const str = this.strings.find(s => s.id === stringId);
        if (str) {
            str.targetVibration = 1.0;
            str.highlight = 1.0;
            this.emitParticles(str.id);
            if (this.onStringPluck) this.onStringPluck(stringId);
        }
    }

    // Call this to show the user which string is currently the target
    setPromptTarget(stringId) {
        this.strings.forEach(s => {
            if (s.id === stringId) {
                // Keep target pulsed slightly
                s.highlight = Math.max(s.highlight, 0.4);
            }
        });
    }

    emitParticles(stringId) {
        const str = this.strings.find(s => s.id === stringId);
        if (!str) return;

        let px, py;
        if (this.isHorizontal) {
            px = this.width / 2;
            py = this.height * str.yPos;
        } else {
            px = this.width * str.yPos;
            py = this.height / 2;
        }

        const count = 10 + Math.random() * 10;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: px + (Math.random() * 40 - 20),
                y: py + (Math.random() * 40 - 20),
                vx: (Math.random() * 4 - 2) * (this.isHorizontal ? 1 : 2),
                vy: (Math.random() * 4 - 2) * (this.isHorizontal ? 2 : 1),
                radius: 2 + Math.random() * 4,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                color: str.color
            });
        }
    }

    update(dt) {
        // String Physics
        this.strings.forEach(str => {
            // Spring force pushing vibration to target
            str.vibration += (str.targetVibration - str.vibration) * 20 * dt;
            // Decay target vibration back to 0
            str.targetVibration *= Math.pow(0.1, dt);

            // Highlight decay
            str.highlight *= Math.pow(0.5, dt);
        });

        // Particle Physics
        // String Quest has a slight directional drag override, so we apply it before standard update
        this.particles.forEach(p => {
            if (this.isHorizontal) {
                p.vx *= 0.99;
                p.vy *= 0.95;
            } else {
                p.vy *= 0.99;
                p.vx *= 0.95;
            }
        });
        updateParticles(this.particles);
    }

    draw() {
        // Deep background
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const time = performance.now() / 1000;

        // Draw Strings
        this.strings.forEach(str => {
            this.ctx.save();

            // Base shadow/glow
            this.ctx.shadowColor = str.color;
            this.ctx.shadowBlur = 10 + (str.highlight * 30);

            // Draw Sine wave
            this.ctx.beginPath();

            const amplitude = str.vibration * 30 * Math.sin(time * 50); // Fast vibration frequency

            if (this.isHorizontal) {
                const py = this.height * str.yPos;
                this.ctx.moveTo(0, py);

                // Draw bezier or sine segments
                for (let x = 0; x <= this.width; x += 20) {
                    // String fixed at ends, max vibration in middle
                    const envelope = Math.sin((x / this.width) * Math.PI);
                    const y = py + amplitude * envelope * Math.sin((x / 100) + time * 20);
                    this.ctx.lineTo(x, y);
                }
            } else {
                // Vertical (Pizzicato)
                const px = this.width * str.yPos;
                this.ctx.moveTo(px, 0);

                for (let y = 0; y <= this.height; y += 20) {
                    const envelope = Math.sin((y / this.height) * Math.PI);
                    const x = px + amplitude * envelope * Math.sin((y / 100) + time * 20);
                    this.ctx.lineTo(x, y);
                }
            }

            // String styling
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + str.highlight * 0.6})`;
            this.ctx.lineWidth = str.thickness + (str.highlight * 4);
            this.ctx.stroke();

            // Draw String Label
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = str.color;
            this.ctx.font = 'bold 32px var(--font-primary, system-ui)';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            if (this.isHorizontal) {
                // Label on the left
                this.ctx.fillText(str.id, 40, this.height * str.yPos);
            } else {
                // Label at the bottom
                this.ctx.fillText(str.id, this.width * str.yPos, this.height - 40);
            }

            this.ctx.restore();
        });

        // Draw Particles
        drawGlowingParticles(this.ctx, this.particles);
    }

    destroy() {
        super.destroy();
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    }
}
