import React from 'react';

/**
 * Skeleton loading placeholder (spec 2685-2689).
 * Matches target dimensions. Shimmer gradient sweep, 1.8s loop, warm tint.
 * Fade-in on mount.
 *
 * @param {object} props
 * @param {string|number} [props.width='100%']
 * @param {string|number} [props.height='20px']
 * @param {string} [props.variant='text'] - 'text' | 'card' | 'circle' | 'rect'
 * @param {number} [props.index=0] - For staggered delay (sibling-index × 60ms)
 */
export function Skeleton({ width = '100%', height = '20px', variant = 'text', index = 0 }) {
    const borderRadius = variant === 'circle' ? '50%'
        : variant === 'card' ? 'var(--radius-lg, 12px)'
            : variant === 'text' ? '4px'
                : 'var(--radius-md, 8px)';

    return (
        <div
            className="skeleton-shimmer"
            aria-hidden="true"
            style={{
                width,
                height,
                borderRadius,
                background: 'linear-gradient(90deg, rgba(255,245,235,0.6) 25%, rgba(255,228,205,0.8) 50%, rgba(255,245,235,0.6) 75%)',
                backgroundSize: '200% 100%',
                animation: `skeleton-sweep 1.8s ease-in-out infinite`,
                animationDelay: `${index * 60}ms`,
                opacity: 0,
                animationName: 'skeleton-fadein, skeleton-sweep',
                animationDuration: 'var(--duration-fast, 150ms), 1.8s',
                animationTimingFunction: 'ease-out, ease-in-out',
                animationIterationCount: '1, infinite',
                animationFillMode: 'forwards, none',
            }}
        />
    );
}

// Inject keyframes globally once
if (typeof document !== 'undefined' && !document.getElementById('skeleton-keyframes')) {
    const style = document.createElement('style');
    style.id = 'skeleton-keyframes';
    style.textContent = `
        @keyframes skeleton-sweep {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        @keyframes skeleton-fadein {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}
