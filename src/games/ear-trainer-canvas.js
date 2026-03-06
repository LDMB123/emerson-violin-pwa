import {
    updateParticles,
    restoreAndDrawParticles,
    emitRadialParticles,
    traceLinePath,
    fillCanvas,
} from '../utils/canvas-utils.js';
import { BaseCanvasEngine } from '../utils/canvas-engine.js';
import { createAudioContext } from '../audio/audio-context.js';

// Module-level cache: MediaElementAudioSourceNode can only be created once
// per <audio> element (Web Audio spec). We cache the AudioContext, analyser,
// and source nodes so they survive game re-binds (Play Again).
let sharedAudioCtx = null;
let sharedAnalyser = null;
const sourceCache = new WeakMap();

const ensureAudioGraph = (audioElements) => {
    if (!sharedAudioCtx) {
        sharedAudioCtx = createAudioContext();
        if (!sharedAudioCtx) return { audioCtx: null, analyser: null };
        sharedAnalyser = sharedAudioCtx.createAnalyser();
        sharedAnalyser.fftSize = 2048;
        sharedAnalyser.connect(sharedAudioCtx.destination);
    }

    // Connect any audio elements that haven't been connected yet
    Object.values(audioElements).forEach(audioEl => {
        if (!audioEl || sourceCache.has(audioEl)) return;
        try {
            const source = sharedAudioCtx.createMediaElementSource(audioEl);
            source.connect(sharedAnalyser);
            sourceCache.set(audioEl, source);
        } catch {
            // Already connected by another context — safe to ignore
        }
    });

    return { audioCtx: sharedAudioCtx, analyser: sharedAnalyser };
};

export class EarTrainerCanvasEngine extends BaseCanvasEngine {
    constructor(canvas, audioElements) {
        super(canvas);

        // Reuse the module-level audio graph (survives re-binds)
        const { audioCtx, analyser } = ensureAudioGraph(audioElements);
        this.audioCtx = audioCtx;
        this.analyser = analyser;

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        // Visual state
        this.particles = [];
        this.pulseRing = 0;
        this.lastRMS = 0;

        // Resume AudioContext on first user interaction if suspended
        const resumeAudio = () => {
            this.resumeAudioContext();
            document.removeEventListener('pointerdown', resumeAudio);
        };
        document.addEventListener('pointerdown', resumeAudio);
    }

    resumeAudioContext() {
        if (this.audioCtx && (this.audioCtx.state === 'suspended' || this.audioCtx.state === 'interrupted')) {
            this.audioCtx.resume();
        }
    }

    emitParticles(intensity) {
        if (intensity < 0.1) return;

        const particleCount = Math.floor(intensity * 10);
        emitRadialParticles({
            particles: this.particles,
            count: particleCount,
            x: this.width / 2,
            y: this.height / 2,
            radiusOffset: 30,
            speedBase: 2,
            speedVariance: intensity * 15,
            sizeBase: 2,
            sizeVariance: 4,
            colorResolver: () => `hsl(${Math.random() * 60 + 180}, 100%, 70%)`
        });
    }



    start() {
        this.resumeAudioContext();
        super.start();
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
        updateParticles(this.particles);
    }

    draw() {
        // Deep space background with slight fade for trails
        fillCanvas(this.ctx, this.width, this.height, 'rgba(10, 10, 26, 0.4)');

        const center = [this.width / 2, this.height / 2];

        // Draw Central Pulse Ring
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(center[0], center[1], 40 + (this.lastRMS * 200), 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(0, 229, 255, ${this.lastRMS * 2})`;
        this.ctx.lineWidth = 4 + (this.lastRMS * 10);
        this.ctx.stroke();

        // Draw Speaker/Ear Icon in center
        this.ctx.fillStyle = `rgba(0, 229, 255, ${0.5 + this.lastRMS})`;
        this.ctx.font = '60px Arial';
        const earContext = this.ctx;
        earContext.textAlign = 'center';
        earContext.textBaseline = 'middle';
        const [centerX, centerY] = center;

        // Slightly scale icon based on volume
        const iconScale = 1 + this.lastRMS;
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(iconScale, iconScale);
        this.ctx.fillText('👂', 0, 0);
        this.ctx.restore();

        // Draw Circular Waveform
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#00e5ff';
        this.ctx.lineWidth = 3;

        const radius = 90;
        // Don't draw the full buffer, it's too long and overlaps creating noise. 
        // Draw a clean segment mapped around the circle.
        const sliceWidth = (Math.PI * 2) / 256;

        traceLinePath(this.ctx, 256, (i, point) => {
            const v = this.dataArray[i] / 128.0; // 0 to 2
            const r = radius + (v * 40 - 40); // Baseline radius + amplitude
            point.x = r * Math.cos(i * sliceWidth);
            point.y = r * Math.sin(i * sliceWidth);
        });

        this.ctx.closePath();
        this.ctx.stroke();

        // Add symmetrical outer glow
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00e5ff';
        this.ctx.stroke();
        restoreAndDrawParticles(this.ctx, this.particles);
    }

    destroy() {
        super.destroy();
        // Do NOT close the shared AudioContext — it is module-level and
        // reused across game re-binds. Closing it would break subsequent
        // ear-trainer sessions since MediaElementSourceNodes cannot be
        // re-created for the same <audio> elements.
    }
}
