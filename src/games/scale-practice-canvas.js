export class ScalePracticeCanvasEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = canvas.width;
        this.height = canvas.height;
        this.isRunning = false;

        // Scale notes definition specific to G Major two-octave scale
        this.notes = ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G', 'F#', 'E', 'D', 'C', 'B', 'A', 'G'];
        this.activeIndex = 0;
        this.notesState = this.notes.map(() => ({ highlight: 0, scale: 1, particleEmitTime: 0 }));

        this.particles = [];
        this.lastTime = performance.now();

        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
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

    reset() {
        this.activeIndex = 0;
        this.particles = [];
        this.notesState.forEach(state => {
            state.highlight = 0;
            state.scale = 1.0;
            state.particleEmitTime = 0;
        });
    }

    emitParticles(x, y, color) {
        const count = 5 + Math.random() * 10;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push({
                x: x + (Math.random() * 10 - 5),
                y: y + (Math.random() * 10 - 5),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,   // Slight upward bias
                radius: 1 + Math.random() * 3,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.04,
                color
            });
        }
    }

    handleResize() {
        // Handled by CSS sizing and aspect ratios
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
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        const totalNotes = this.notes.length;
        const noteSpacing = this.width / totalNotes;
        const cy = this.height / 2;

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
                const px = (i + 0.5) * noteSpacing;

                // Determine vertical elevation based on scale contour (arch shape)
                const distanceFromStart = i <= 7 ? i : 14 - i;
                const elevationRatio = distanceFromStart / 7;
                const py = cy + 20 - (elevationRatio * 60);

                // Determine color based on ascending vs descending
                const isAscending = i < 7;
                const isApex = i === 7;
                let color = isApex ? '#ffeb3b' : (isAscending ? '#00e5ff' : '#ff4081');

                if (Math.random() > 0.5) {
                    this.emitParticles(px, py, color);
                }
            }
        });

        // Particle Physics
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98; // Drag
            p.vy += 0.05; // Gravity
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // Deep background
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const totalNotes = this.notes.length;
        const noteSpacing = this.width / totalNotes;
        const cy = this.height / 2;
        const time = performance.now() / 1000;

        // Draw Baseline connecting path
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 4;

        for (let i = 0; i < totalNotes; i++) {
            const px = (i + 0.5) * noteSpacing;
            const distanceFromStart = i <= 7 ? i : 14 - i;
            const elevationRatio = distanceFromStart / 7;
            const py = cy + 20 - (elevationRatio * 60);

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.stroke();
        this.ctx.restore();

        // Draw Sequence Nodes
        for (let i = 0; i < totalNotes; i++) {
            const state = this.notesState[i];
            const px = (i + 0.5) * noteSpacing;

            // Arch shape (Highest pitch is highest visually)
            const distanceFromStart = i <= 7 ? i : 14 - i;
            const elevationRatio = distanceFromStart / 7;
            // Add a subtle wave animation to the entire track
            const waveOffset = Math.sin(time * 2 + i * 0.5) * 5;
            const py = cy + 20 - (elevationRatio * 60) + waveOffset;

            const isAscending = i < 7;
            const isApex = i === 7;
            // Theme colors: Cyan for ascending, Yellow for Apex, Pink for descending
            const baseColor = isApex ? [255, 235, 59] : (isAscending ? [0, 229, 255] : [255, 64, 129]);
            const hexColor = isApex ? '#ffeb3b' : (isAscending ? '#00e5ff' : '#ff4081');

            this.ctx.save();
            this.ctx.translate(px, py);
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
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // Slight Y offset to perfectly center font baseline
            this.ctx.fillText(this.notes[i], 0, 1);

            this.ctx.restore();
        }

        // Draw Particles
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'screen';
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
    }
}
