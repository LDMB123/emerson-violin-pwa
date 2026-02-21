export class EarTrainerCanvasEngine {
    constructor(canvas, audioElements) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = canvas.width;
        this.height = canvas.height;
        this.isRunning = false;

        // Web Audio API Setup
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        this.analyser = this.audioCtx.createAnalyser();

        // High resolution for smooth 2D rendering
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // Connect each audio element to the single visualizer analyser
        this.mediaSources = [];
        Object.values(audioElements).forEach(audioEl => {
            if (audioEl) {
                // MediaElementAudioSourceNode can only be created once per element
                // We wrap this in a try-catch in case it was already created somewhere else
                try {
                    const source = this.audioCtx.createMediaElementSource(audioEl);
                    source.connect(this.analyser);
                    this.mediaSources.push(source);
                } catch (e) {
                    // Safe to ignore if already connected
                    console.warn('AudioSource already connected', e);
                }
            }
        });

        // Final output to speakers
        this.analyser.connect(this.audioCtx.destination);

        // Visual state
        this.particles = [];
        this.pulseRing = 0;
        this.lastRMS = 0;

        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);

        // Resume AudioContext on first user interaction if suspended
        const resumeAudio = () => {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            document.removeEventListener('pointerdown', resumeAudio);
        };
        document.addEventListener('pointerdown', resumeAudio);
    }

    emitParticles(intensity) {
        if (intensity < 0.1) return;

        const count = Math.floor(intensity * 10);
        const cx = this.width / 2;
        const cy = this.height / 2;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * (intensity * 15);
            this.particles.push({
                x: cx + Math.cos(angle) * 30,
                y: cy + Math.sin(angle) * 30,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 2 + Math.random() * 4,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                color: `hsl(${Math.random() * 60 + 180}, 100%, 70%)` // Cyan/Blue spectrum
            });
        }
    }

    handleResize() {
        // Handled via CSS sizing constraints
    }

    start() {
        if (this.isRunning) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
    }

    loop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        // Collect frequency data
        this.analyser.getByteTimeDomainData(this.dataArray);

        // Calculate RMS (Root Mean Square) for volume intensity
        let sumSquares = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const normalized = (this.dataArray[i] / 128.0) - 1.0;
            sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / this.bufferLength);

        // Smooth RMS detection for visual popping
        this.lastRMS += (rms - this.lastRMS) * 0.2;

        // Trigger pulse/particles on significant volume changes
        if (rms > 0.1 && rms > this.pulseRing * 1.5) {
            this.pulseRing = rms;
            this.emitParticles(rms);
        }

        // Decay pulse ring
        this.pulseRing *= 0.95;

        // Particle Physics
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98; // Friction
            p.vy *= 0.98;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // Deep space background with slight fade for trails
        this.ctx.fillStyle = 'rgba(10, 10, 26, 0.4)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const cx = this.width / 2;
        const cy = this.height / 2;

        // Draw Central Pulse Ring
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 40 + (this.lastRMS * 200), 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(0, 229, 255, ${this.lastRMS * 2})`;
        this.ctx.lineWidth = 4 + (this.lastRMS * 10);
        this.ctx.stroke();

        // Draw Speaker/Ear Icon in center
        this.ctx.fillStyle = `rgba(0, 229, 255, ${0.5 + this.lastRMS})`;
        this.ctx.font = '60px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Slightly scale icon based on volume
        const iconScale = 1 + this.lastRMS;
        this.ctx.translate(cx, cy);
        this.ctx.scale(iconScale, iconScale);
        this.ctx.fillText('👂', 0, 0);
        this.ctx.restore();

        // Draw Circular Waveform
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.lineWidth = 3;

        const radius = 90;
        // Don't draw the full buffer, it's too long and overlaps creating noise. 
        // Draw a clean segment mapped around the circle.
        const sliceWidth = (Math.PI * 2) / 256;

        for (let i = 0; i < 256; i++) {
            const v = this.dataArray[i] / 128.0; // 0 to 2
            const r = radius + (v * 40 - 40); // Baseline radius + amplitude

            const x = r * Math.cos(i * sliceWidth);
            const y = r * Math.sin(i * sliceWidth);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.closePath();
        this.ctx.stroke();

        // Add symmetrical outer glow
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00e5ff';
        this.ctx.stroke();
        this.ctx.restore();

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
        if (this.audioCtx) {
            this.audioCtx.close();
        }
    }
}
