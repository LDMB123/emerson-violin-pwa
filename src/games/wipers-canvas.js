import { DragCanvasEngineBase } from './drag-canvas-engine-base.js';
import { clamp } from '../utils/math.js';

export class WipersCanvasEngine extends DragCanvasEngineBase {
    constructor(canvas, onScoreUpdate) {
        super(canvas, onScoreUpdate);

        this.score = 0;
        this.wipes = 0;

        // Player's device orientation (simulated by touch/mouse drag for now)
        this.armAngle = 0;

        this.pointer = { x: 0, y: 0, isDown: false };

        this.bindMappedDrag({
            isTracking: () => this.pointer.isDown,
            onStart: () => {
                this.pointer.isDown = true;
            },
            onMove: ({ x }) => {
                this.pointer.x = x;
                this.evaluateWipe();
            },
            onEnd: () => {
                this.pointer.isDown = false;
                // Snap back to 0
                this.armAngle = 0;
            },
        });
    }

    evaluateWipe() {
        // Map pointer X position to arm rotation (-45 deg to 45 deg)
        const centerX = this.width / 2;
        const offset = this.pointer.x - centerX;

        // Normalizing rotation mapping
        const maxOffset = this.width * 0.4;
        let rotationPercent = offset / maxOffset;
        rotationPercent = clamp(rotationPercent, -1, 1);

        const MAX_ROTATION = Math.PI / 4; // 45 degrees
        this.armAngle = rotationPercent * MAX_ROTATION;

        // Basic physics: Cheerio slides off if rotation is too extreme, 
        // but since this is a wiper game, we WANT extreme rotation.
        // Let's reward alternating full wipes.

        if (!this.lastPeak) this.lastPeak = 0;

        if (this.armAngle > (MAX_ROTATION * 0.8) && this.lastPeak <= 0) {
            this.wipes++;
            this.lastPeak = 1;
            this.score += 10;
        } else if (this.armAngle < -(MAX_ROTATION * 0.8) && this.lastPeak >= 0) {
            this.wipes++;
            this.lastPeak = -1;
            this.score += 10;
        }

        this.notifyScoreUpdate(this.score, this.wipes);
    }

    render(ctx) {
        const { centerX } = this.fillBackgroundAndGetCenter(ctx, '#fff8f1');
        const centerY = this.height * 0.8;
        const armLength = Math.min(this.width, this.height) * 0.6;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.armAngle);

        // Draw "Arm" / Wiper blade
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -armLength);
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#222';
        ctx.stroke();

        // Draw Hand
        ctx.beginPath();
        ctx.arc(0, -armLength, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#f5c6a5'; // Skin tone
        ctx.fill();

        // Draw Cheerio
        ctx.beginPath();
        ctx.arc(0, -armLength - 10, 15, 0, Math.PI * 2);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#f1c40f'; // Cheerio yellow
        ctx.stroke();

        ctx.restore();

        // Draw Arc Target line
        ctx.beginPath();
        ctx.arc(centerX, centerY, armLength, -Math.PI / 2 - Math.PI / 4, -Math.PI / 2 + Math.PI / 4);
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.setLineDash([20, 20]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    start() {
        this.score = 0;
        this.wipes = 0;
        this.armAngle = 0;
        this.lastPeak = 0;
        super.start();
    }
}
