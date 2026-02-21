export class RhythmCanvasEngine {
    constructor(canvas, { colors = ['#00e5ff', '#39ff14', '#ffea00', '#ff0055'] } = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.width = canvas.width;
        this.height = canvas.height;
        this.colors = colors;

        this.notes = [];
        this.particles = [];

        this.isRunning = false;
        this.lastTime = 0;

        this.speed = 2.0;
        this.horizonY = this.height * 0.25;
        this.hitY = this.height * 0.85;
        this.laneWidth = 100;

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

    triggerHitExplosion(laneIndex, zPos) {
        const color = this.colors[laneIndex % this.colors.length];
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                lane: laneIndex,
                z: zPos,
                xOffset: (Math.random() - 0.5) * 80,
                yOffset: (Math.random() - 0.5) * 80,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                vz: (Math.random() - 0.5) * 20,
                life: 1.0,
                color
            });
        }
    }

    project3D(lane, z, xOffset = 0, yOffset = 0) {
        // Perspective mapped projection
        const focalLength = 300;
        const scale = focalLength / (focalLength + z);
        const centerLane = (this.colors.length - 1) / 2;
        const xPos = (lane - centerLane) * this.laneWidth;

        // Deep infinity highway effect
        const x = (this.width / 2) + (xPos + xOffset) * scale;
        const y = this.hitY - ((1.0 - scale) * (this.hitY - this.horizonY)) + (yOffset * scale);

        return { x, y, scale };
    }

    render(time) {
        if (!this.isRunning) return;
        requestAnimationFrame(this.render);

        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        const ctx = this.ctx;

        // Clear background with neon gradient trail
        ctx.fillStyle = 'rgba(10, 5, 25, 0.3)';
        ctx.fillRect(0, 0, this.width, this.height);

        // Render highway grid
        ctx.strokeStyle = 'rgba(50, 0, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= this.colors.length; i++) {
            const pBottom = this.project3D(i - 0.5, 0);
            const pTop = this.project3D(i - 0.5, 1000);
            ctx.moveTo(pBottom.x, pBottom.y);
            ctx.lineTo(pTop.x, pTop.y);
        }
        ctx.stroke();

        // Render hit zone line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const leftHit = this.project3D(-0.5, 0);
        const rightHit = this.project3D(this.colors.length - 0.5, 0);
        ctx.moveTo(leftHit.x, leftHit.y);
        ctx.lineTo(rightHit.x, rightHit.y);
        ctx.stroke();

        // Update and render notes
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            if (!note.active) continue;

            note.z -= 1000 * dt * this.speed;

            if (note.z < -200) {
                note.active = false;
                continue;
            }

            const p = this.project3D(note.lane, note.z);
            const size = 30 * p.scale;

            ctx.fillStyle = this.colors[note.lane % this.colors.length];
            ctx.shadowBlur = 20 * p.scale;
            ctx.shadowColor = ctx.fillStyle;

            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Glass flare
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(p.x - size * 0.3, p.y - size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Update and render particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.life -= dt * 1.5;

            if (pt.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            pt.xOffset += pt.vx;
            pt.yOffset += pt.vy;
            pt.z += pt.vz;

            const p = this.project3D(pt.lane, pt.z, pt.xOffset, pt.yOffset);

            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, 8 * p.scale * pt.life), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Clean up inactive notes
        this.notes = this.notes.filter(n => n.active);
    }
}
