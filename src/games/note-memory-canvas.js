export class NoteMemoryCanvasEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.width = canvas.width;
        this.height = canvas.height;
        this.cards = [];
        this.particles = [];
        this.isRunning = false;
        this.lastTime = performance.now();
        this.onCardTapped = null;

        this.initCards();
        this.handleResize = this.handleResize.bind(this);
        this.handlePointerDown = this.handlePointerDown.bind(this);

        window.addEventListener('resize', this.handleResize);
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

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    handleResize() {
        const rect = this.canvas.getBoundingClientRect();
        // Maintain internal 800x600 resolution for logic, but CSS scales it
        // If we want sharp text, we could adjust canvas.width = rect.width * dpr
        // but fixed resolution is easier for consistent layout math right now.
    }

    handlePointerDown(e) {
        if (!this.onCardTapped) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        for (const card of this.cards) {
            if (card.isMatched) continue;

            if (x >= card.x && x <= card.x + card.width &&
                y >= card.y && y <= card.y + card.height) {

                // Card tapped!
                card.targetScale = 0.95; // Squish effect
                setTimeout(() => {
                    if (!card.isFlipped) card.targetScale = 1;
                }, 100);

                this.onCardTapped(card);
                break;
            }
        }
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
        // Update physics
        this.cards.forEach(card => {
            // Spring physics for flip
            card.flipProgress += (card.targetFlip - card.flipProgress) * 10 * dt;
            // Spring physics for scale
            card.scale += (card.targetScale - card.scale) * 15 * dt;
        });

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
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
        this.stop();
        window.removeEventListener('resize', this.handleResize);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    }
}
