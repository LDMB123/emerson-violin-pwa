import { updateParticles, emitRadialParticles } from '../utils/canvas-utils.js';
import { BaseCanvasEngine } from '../utils/canvas-engine.js';

export class NoteMemoryCanvasEngine extends BaseCanvasEngine {
    constructor(canvas) {
        super(canvas);
        this.cards = [];
        this.onCardTapped = null;

        this.initCards();
        this.handlePointerDown = this.handlePointerDown.bind(this);
        canvas.addEventListener('pointerdown', this.handlePointerDown);
    }

    initCards() {
        const cols = 4;
        const rows = 3;
        const padding = 20;
        const cardWidth = (this.width - (padding * (cols + 1))) / cols;
        const cardHeight = (this.height - (padding * (rows + 1))) / rows;

        this.cards = [];
        let index = 0;

        // Default fixed setup to match HTML (6 pairs)
        const baseNotes = ['G', 'D', 'A', 'E', 'C', 'B', 'G', 'D', 'A', 'E', 'C', 'B'];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = padding + c * (cardWidth + padding);
                const y = padding + r * (cardHeight + padding);

                this.cards.push({
                    id: index,
                    x, y,
                    width: cardWidth,
                    height: cardHeight,
                    note: baseNotes[index],
                    isFlipped: false,
                    isMatched: false,
                    flipProgress: 0, // 0 to 1
                    targetFlip: 0,
                    scale: 1,
                    targetScale: 1
                });
                index++;
            }
        }
    }

    setCards(noteValues) {
        if (noteValues.length === this.cards.length) {
            this.cards.forEach((card, i) => {
                card.note = noteValues[i];
                card.isFlipped = false;
                card.isMatched = false;
                card.flipProgress = 0;
                card.targetFlip = 0;
                card.scale = 1;
                card.targetScale = 1;
            });
        }
    }

    reset() {
        this.particles = [];
        this.cards.forEach(c => {
            c.isFlipped = false;
            c.isMatched = false;
            c.targetFlip = 0;
            c.targetScale = 1;
        });
    }

    flipCard(id, flipped) {
        const card = this.cards.find(c => c.id === id);
        if (card) {
            card.isFlipped = flipped;
            card.targetFlip = flipped ? 1 : 0;
            card.targetScale = flipped ? 1.05 : 1;
        }
    }

    matchCards(card1Id, card2Id) {
        const c1 = this.cards.find(c => c.id === card1Id);
        const c2 = this.cards.find(c => c.id === card2Id);

        if (c1 && c2) {
            c1.isMatched = true;
            c2.isMatched = true;
            c1.targetScale = 1;
            c2.targetScale = 1;

            this.emitParticles(c1.x + c1.width / 2, c1.y + c1.height / 2, c1.note);
            this.emitParticles(c2.x + c2.width / 2, c2.y + c2.height / 2, c2.note);
        }
    }

    emitParticles(cx, cy, note) {
        const count = 30;
        const colors = note === 'G' ? ['#ff9ed2', '#ff4081'] :
            note === 'D' ? ['#7c4dff', '#b388ff'] :
                note === 'A' ? ['#00e5ff', '#84ffff'] :
                    note === 'E' ? ['#69f0ae', '#b9f6ca'] :
                        ['#ffd740', '#ffe57f'];

        emitRadialParticles({
            particles: this.particles,
            count,
            x: cx,
            y: cy,
            speedBase: 2,
            speedVariance: 8,
            sizeBase: 3,
            sizeVariance: 6,
            colorResolver: () => colors[Math.floor(Math.random() * colors.length)]
        });
    }

    update(dt) {
        // Update physics
        this.cards.forEach(card => {
            // Spring physics for flip
            card.flipProgress += (card.targetFlip - card.flipProgress) * 10 * dt;
            // Spring physics for scale
            card.scale += (card.targetScale - card.scale) * 15 * dt;
        });

        // Update particles
        updateParticles(this.particles);
    }

    draw() {
        this.ctx.fillStyle = '#2f1d16'; // Deep warm background
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw cards
        this.cards.forEach(card => {
            this.ctx.save();

            // Center for transforms
            const cx = card.x + card.width / 2;
            const cy = card.y + card.height / 2;

            this.ctx.translate(cx, cy);
            this.ctx.scale(card.scale, card.scale);

            // 3D Flip effect (scale X)
            const flipMath = Math.cos(card.flipProgress * Math.PI);
            this.ctx.scale(flipMath, 1);

            const isFront = card.flipProgress > 0.5;

            // Shift top-left back relative to center
            this.ctx.translate(-card.width / 2, -card.height / 2);

            if (!isFront) {
                // Draw Card Back (Question Mark)
                this.ctx.fillStyle = '#4e342e';
                this.ctx.beginPath();
                this.ctx.roundRect(0, 0, card.width, card.height, 16);
                this.ctx.fill();

                // Border
                this.ctx.strokeStyle = '#6d4c41';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();

                // Inner text ?
                this.ctx.fillStyle = '#8d6e63';
                this.ctx.font = 'bold 64px Fredoka, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('?', card.width / 2, card.height / 2);
            } else {
                // Draw Card Face (Note)
                this.ctx.save();
                // Fix orientation because of negative scale across Y-axis via cos
                this.ctx.scale(-1, 1);
                this.ctx.translate(-card.width, 0);

                if (card.isMatched) {
                    this.ctx.fillStyle = '#1b5e20'; // Success green back
                    this.ctx.shadowColor = '#4caf50';
                    this.ctx.shadowBlur = 20;
                } else {
                    this.ctx.fillStyle = '#fff3e0'; // Warm white paper
                }

                this.ctx.beginPath();
                this.ctx.roundRect(0, 0, card.width, card.height, 16);
                this.ctx.fill();
                this.ctx.shadowBlur = 0; // reset

                // Text Note
                this.ctx.fillStyle = card.isMatched ? '#a5d6a7' : '#d84315';
                this.ctx.font = 'bold 72px Fredoka, sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(card.note, card.width / 2, card.height / 2);

                this.ctx.restore();
            }

            this.ctx.restore();
        });

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    destroy() {
        super.destroy();
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    }
}
