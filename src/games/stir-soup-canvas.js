import { DragCanvasEngineBase } from './drag-canvas-engine-base.js';

export class StirSoupCanvasEngine extends DragCanvasEngineBase {
    constructor(canvas, onScoreUpdate = null) {
        super(canvas, onScoreUpdate);

        this.isStirring = false;
        this.pointer = { x: 0, y: 0 };
        this.targetAngle = 0;
        this.currentAngle = 0;

        this.resetRunState();

        // Colors from liquid-glass spec
        this.soupColor = { r: 245, g: 107, b: 73 }; // Brand Orange
        this.activeColor = { r: 52, g: 199, b: 89 }; // Success Green
        this.splashColor = { r: 255, g: 59, b: 48 }; // Error Red

        this.bindMappedDrag({
            isTracking: () => this.isStirring,
            onStart: () => {
                this.isStirring = true;
            },
            onMove: ({ x, y }) => {
                this.pointer.x = x;
                this.pointer.y = y;
                this.evaluateStir();
            },
            onEnd: () => {
                this.isStirring = false;
            },
        });
    }

    resetRunState() {
        this.score = 0;
        this.smoothness = 100;
        this.laps = 0;
    }

    evaluateStir() {
        // Calculate angle from center of canvas
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const dx = this.pointer.x - centerX;
        const dy = this.pointer.y - centerY;

        let newAngle = Math.atan2(dy, dx);
        if (newAngle < 0) newAngle += Math.PI * 2;

        // Check angular velocity
        let delta = newAngle - this.currentAngle;

        // Handle lap wrap-around
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;

        // Absolute speed of movement
        const speed = Math.abs(delta);

        if (speed > 0.05 && speed < 0.3) {
            // Good smooth stir
            this.smoothness = Math.min(100, this.smoothness + 1);
            this.score += 5;
            this.targetAngle += delta; // Chase the target
        } else if (speed >= 0.3) {
            // Stirring too fast! Splashing!
            this.smoothness = Math.max(0, this.smoothness - 5);
        }

        this.currentAngle = newAngle;

        // Check for full lap
        if (Math.abs(this.targetAngle) >= Math.PI * 2) {
            this.laps++;
            this.targetAngle %= (Math.PI * 2);
            this.score += 100; // Lap bonus
        }

        this.notifyScoreUpdate(this.score, this.smoothness);
    }

    render(ctx) {
        const { centerX, centerY } = this.fillBackgroundAndGetCenter(ctx, '#fff8f1');
        const radius = Math.min(this.width, this.height) * 0.35;

        // Draw Soup Pot
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#5a3d2b';
        ctx.stroke();

        // Draw Soup Liquid (Color changes based on smoothness)
        let currentColor = `rgb(${this.soupColor.r}, ${this.soupColor.g}, ${this.soupColor.b})`;
        if (this.isStirring) {
            if (this.smoothness > 80) {
                currentColor = `rgb(${this.activeColor.r}, ${this.activeColor.g}, ${this.activeColor.b})`;
            } else if (this.smoothness < 40) {
                currentColor = `rgb(${this.splashColor.r}, ${this.splashColor.g}, ${this.splashColor.b})`; // Splashing warning!
            }
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
        ctx.fillStyle = currentColor;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Draw "Spoon" / Pointer Target
        if (this.isStirring) {
            ctx.beginPath();
            ctx.arc(this.pointer.x, this.pointer.y, 40, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            ctx.fill();
            ctx.shadowColor = 'transparent';
        } else {
            // Pulsing target to show where to start
            const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
            ctx.beginPath();
            ctx.arc(centerX + radius * Math.cos(this.targetAngle), centerY + radius * Math.sin(this.targetAngle), 30 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
        }

        // Draw Swirls
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, this.targetAngle, this.targetAngle + Math.PI, false);
        ctx.lineWidth = 15;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    start() {
        this.resetRunState();
        this.isStirring = false;
        this.targetAngle = 0;
        super.start();
    }
}
