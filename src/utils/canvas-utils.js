export function updateParticles(particles, dt = 1) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

export function emitRadialParticles({
    particles,
    count,
    x,
    y,
    radiusOffset = 0,
    xVariance = 0,
    yVariance = 0,
    speedBase = 2,
    speedVariance = 4,
    gravityY = 0,
    sizeBase = 2,
    sizeVariance = 4,
    lifeBase = 1.0,
    decayBase = 0.02,
    decayVariance = 0.03,
    colorResolver
}) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = speedBase + Math.random() * speedVariance;
        particles.push({
            x: x + Math.cos(angle) * radiusOffset + (Math.random() * xVariance - xVariance / 2),
            y: y + Math.sin(angle) * radiusOffset + (Math.random() * yVariance - yVariance / 2),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed + gravityY,
            radius: sizeBase + Math.random() * sizeVariance,
            life: lifeBase,
            decay: decayBase + Math.random() * decayVariance,
            color: colorResolver ? colorResolver(i) : '#ffffff'
        });
    }
}

export function drawGlowingParticles(ctx, particles) {
    if (!particles || particles.length === 0) return;

    ctx.save();
    // Additive blending for magic glowing particles
    ctx.globalCompositeOperation = 'screen';
    particles.forEach(p => {
        ctx.globalAlpha = p.life < 0 ? 0 : p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}
