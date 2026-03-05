import { BaseCanvasEngine } from '../utils/canvas-engine.js';
import { traceLinePath } from '../utils/canvas-utils.js';

export class EchoGameCanvasEngine extends BaseCanvasEngine {
    constructor(canvasEl) {
        super(canvasEl);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.gameState = {
            phase: 'idle', // idle, teacher_playing, student_listening, student_playing, evaluating
            teacherBuffer: [],
            studentBuffer: [],
            evaluationScore: 0,
            playheadPosition: 0,
            targetDurationMs: 4000,
        };

        this.colors = {
            accent: '#34C759', // Success green
            tertiary: '#0A84FF', // PWA Blue
            text: '#1C1C1E',
            textDim: '#8E8E93',
        };
    }

    resetGame() {
        this.gameState.phase = 'idle';
        this.gameState.teacherBuffer = [];
        this.gameState.studentBuffer = [];
        this.gameState.evaluationScore = 0;
        this.gameState.playheadPosition = 0;
        this.clear();
    }

    updateState(newState) {
        Object.assign(this.gameState, newState);
        this.draw();
    }

    drawWaveform(buffer, yCenter, height, color, alpha = 1.0) {
        if (!buffer || buffer.length === 0) return;

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 4;
        this.ctx.globalAlpha = alpha;

        const sliceWidth = this.width / buffer.length;
        traceLinePath(this.ctx, buffer.length, (i, point) => {
            // Buffer values are expected to be normalized 0.0 to 1.0 (e.g. onset strength)
            const v = buffer[i];
            point.x = i * sliceWidth;
            point.y = yCenter - (v * height / 2);
        });

        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }

    drawPlayhead() {
        const { phase, playheadPosition } = this.gameState;
        if (phase === 'idle' || phase === 'evaluating') return;

        const x = this.width * playheadPosition;

        this.ctx.beginPath();
        this.ctx.strokeStyle = phase === 'teacher_playing' ? this.colors.accent : this.colors.tertiary;
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();

        // Glow effect
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.ctx.strokeStyle;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    render() {
        this.clear();

        // Background divided into two halves
        const midY = this.height / 2;

        // Draw dividing line
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(0, midY);
        this.ctx.lineTo(this.width, midY);
        this.ctx.stroke();

        const waveHeight = this.height * 0.4;

        // Teacher Top Half
        this.drawWaveform(
            this.gameState.teacherBuffer,
            midY / 2,
            waveHeight,
            this.colors.accent,
            this.gameState.phase === 'student_playing' ? 0.3 : 1.0
        );

        // Student Bottom Half
        this.drawWaveform(
            this.gameState.studentBuffer,
            midY + (midY / 2),
            waveHeight,
            this.colors.tertiary,
            1.0
        );

        this.drawPlayhead();

        // Draw Evaluation Overlay
        if (this.gameState.phase === 'evaluating') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.fillRect(0, 0, this.width, this.height);

            this.ctx.fillStyle = this.colors.text;
            this.ctx.font = 'bold 48px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            const matchText = this.gameState.evaluationScore > 80 ? 'Perfect Echo!' : 'Try Again!';
            this.ctx.fillText(matchText, this.width / 2, this.height / 2);

            this.ctx.font = '24px Inter, sans-serif';
            this.ctx.fillStyle = this.colors.textDim;
            this.ctx.fillText(`Accuracy: ${Math.round(this.gameState.evaluationScore)}%`, this.width / 2, this.height / 2 + 50);
        }
    }
}
