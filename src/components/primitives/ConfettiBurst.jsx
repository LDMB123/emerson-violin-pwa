import React, { useEffect } from 'react';

/**
 * CSS-only Confetti Burst (spec 1660).
 * Uses pseudo-elements + @keyframes, no JS RAF loops needed.
 * 12 particles with randomized x-drift and spin falling with gravity.
 */
export function ConfettiBurst() {
    useEffect(() => {
        // Inject keyframes globally once
        if (typeof document !== 'undefined' && !document.getElementById('confetti-keyframes')) {
            const style = document.createElement('style');
            style.id = 'confetti-keyframes';
            style.textContent = `
                @keyframes confetti-fall {
                    0%   { transform: translate(0, 0) rotate(0deg) scale(1.5); opacity: 1; }
                    100% { transform: translate(var(--x-drift), 300px) rotate(var(--spin)) scale(1); opacity: 0; }
                }
                .confetti-particle {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    border-radius: 2px;
                    animation: confetti-fall var(--duration-celebration, 800ms) var(--ease-out, cubic-bezier(0.2, 0.8, 0.2, 1)) forwards;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const colors = [
        'var(--color-primary, #E95639)',
        'var(--color-secondary, #F9A93F)',
        'var(--color-accent, #4FB69E)',
        'var(--color-warning, #F9C74F)',
        'var(--color-success, #31D0A0)'
    ];

    // Generate 12 particles
    const particles = Array.from({ length: 12 }).map((_, i) => {
        const xDrift = Math.random() * 120 - 60; // -60px to +60px
        const spin = Math.random() * 540 + 180;  // 180deg to 720deg
        const delay = Math.random() * 200;       // 0 to 200ms stagger
        const color = colors[Math.floor(Math.random() * colors.length)];

        return (
            <div
                key={i}
                className="confetti-particle"
                style={{
                    backgroundColor: color,
                    '--x-drift': `${xDrift}px`,
                    '--spin': `${spin}deg`,
                    animationDelay: `${delay}ms`
                }}
            />
        );
    });

    return (
        <div className="confetti-container" style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 'var(--z-toast, 500)' }} aria-hidden="true">
            {particles}
        </div>
    );
}
