import {
    updateParticles,
    drawGlowingParticles,
    emitRadialParticles,
    fillCanvas,
    traceLinePath,
} from '../utils/canvas-utils.js';
import { BaseCanvasEngine } from '../utils/canvas-engine.js';

export class ScalePracticeCanvasEngine extends BaseCanvasEngine {
    constructor(canvasElement) {
        super(canvasElement);
        this.notes = ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G', 'F#', 'E', 'D', 'C', 'B', 'A', 'G'];
        this.activeIndex = 0;
        this.notesState = this.notes.map(() => ({ highlight: 0, scale: 1, particleEmitTime: 0 }));
    }

    setActiveIndex(index) {
        if (index >= 0 && index < this.notes.length) {
            this.activeIndex = index;
            const state = this.notesState[index];
            state.highlight = 1.0;
            state.scale = 1.2;
            state.particleEmitTime = 0.2; // Emit particles for 200ms
        }
    }

    emitParticles(x, y, color) {
        const count = 5 + Math.floor(Math.random() * 10);
        emitRadialParticles({
            particles: this.particles,
            count,
            x,
            y,
            xVariance: 10,
            yVariance: 10,
            speedBase: 1,
            speedVariance: 3,
            gravityY: -1,
            sizeBase: 1,
            sizeVariance: 3,
            decayVariance: 0.04,
            colorResolver: () => color
        });
    }

    getTrackY(index, cy) {
        const distanceFromStart = index <= 7 ? index : 14 - index;
        const elevationRatio = distanceFromStart / 7;
        return cy + 20 - (elevationRatio * 60);
    }

    getTrackPoint(index, noteSpacing, cy) {
        return {
            x: (index + 0.5) * noteSpacing,
            y: this.getTrackY(index, cy),
        };
    }

    getLayoutMetrics() {
        const totalNotes = this.notes.length;
        return {
            totalNotes,
            noteSpacing: this.width / totalNotes,
            cy: this.height / 2,
        };
    }

    update(dt) {
        const { noteSpacing, cy } = this.getLayoutMetrics();

        // Note Physics (Spring animations)
        this.notesState.forEach((state, i) => {
            // Decay highlights
            if (i !== this.activeIndex) {
                state.highlight *= Math.pow(0.1, dt);
                state.scale += (1.0 - state.scale) * 10 * dt; // Spring back to 1.0
            } else {
                state.scale += (1.4 - state.scale) * 15 * dt; // Spring to larger scale
            }

            // Continuous particle emission while active
            if (state.particleEmitTime > 0) {
                state.particleEmitTime -= dt;
                const point = this.getTrackPoint(i, noteSpacing, cy);

                // Determine color based on ascending vs descending
                const isAscending = i < 7;
                const isApex = i === 7;
                let color = isApex ? '#ffeb3b' : (isAscending ? '#00e5ff' : '#ff4081');

                if (Math.random() > 0.5) {
                    this.emitParticles(point.x, point.y, color);
                }
            }
        });

        // Particle Physics
        updateParticles(this.particles);
    }

    draw() {
        // Deep background
        fillCanvas(this.ctx, this.width, this.height, '#0a0a1a');

        const { totalNotes, noteSpacing, cy } = this.getLayoutMetrics();
        const time = performance.now() / 1000;

        // Draw Baseline connecting path
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 4;
        traceLinePath(this.ctx, totalNotes, (i, pathPoint) => {
            const trackPoint = this.getTrackPoint(i, noteSpacing, cy);
            pathPoint.x = trackPoint.x;
            pathPoint.y = trackPoint.y;
        });
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.restore();

        // Draw Sequence Nodes
        for (let i = 0; i < totalNotes; i++) {
            const state = this.notesState[i];
            const point = this.getTrackPoint(i, noteSpacing, cy);
            // Add a subtle wave animation to the entire track
            const waveOffset = Math.sin(time * 2 + i * 0.5) * 5;
            const py = point.y + waveOffset;

            const isAscending = i < 7;
            const isApex = i === 7;
            // Theme colors: Cyan for ascending, Yellow for Apex, Pink for descending
            const baseColor = isApex ? [255, 235, 59] : (isAscending ? [0, 229, 255] : [255, 64, 129]);
            const hexColor = isApex ? '#ffeb3b' : (isAscending ? '#00e5ff' : '#ff4081');

            this.ctx.save();
            this.ctx.translate(point.x, py);
            this.ctx.scale(state.scale, state.scale);

            // Node Glow
            this.ctx.shadowBlur = 10 + (state.highlight * 30);
            this.ctx.shadowColor = `rgba(${baseColor.join(',')}, ${0.5 + state.highlight * 0.5})`;

            // Node Circle
            this.ctx.beginPath();
            const radius = 18 + (state.highlight * 6);
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);

            if (i === this.activeIndex) {
                this.ctx.fillStyle = hexColor;
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                this.ctx.fill();
                this.ctx.strokeStyle = `rgba(${baseColor.join(',')}, ${0.3 + state.highlight * 0.7})`;
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }

            // Outer ring for active
            if (state.highlight > 0.1) {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(${baseColor.join(',')}, ${state.highlight * 0.5})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Text Label
            this.ctx.shadowBlur = 0;
            if (i === this.activeIndex) {
                // Dark text inverted on solid fill
                this.ctx.fillStyle = '#0a0a1a';
            } else {
                // Colored text to match border
                this.ctx.fillStyle = hexColor;
            }
            this.ctx.font = 'bold 16px var(--font-primary, system-ui)';
            Object.assign(this.ctx, {
                textAlign: 'center',
                textBaseline: 'middle',
            });
            // Slight Y offset to perfectly center font baseline
            this.ctx.fillText(this.notes[i], 0, 1);

            this.ctx.restore();
        }

        // Draw Particles
        drawGlowingParticles(this.ctx, this.particles);
    }
}
