import React, { useEffect, useState } from 'react';

/**
 * Animated checkmark (spec 1570).
 * SVG path drawing animation with stroke-dashoffset.
 * Used for task completion (practice step done, onboarding step done).
 *
 * @param {object} props
 * @param {number} [props.size=32] - Width/height of the checkmark
 * @param {string} [props.color='var(--color-primary)'] - Stroke color
 * @param {boolean} [props.animate=true] - Whether to animate on mount
 * @param {Function} [props.onAnimationEnd] - Callback when drawn
 */
export function Checkmark({ size = 32, color = 'var(--color-primary)', animate = true, onAnimationEnd }) {
    const [drawn, setDrawn] = useState(!animate);

    useEffect(() => {
        if (!animate) return;
        const frame = requestAnimationFrame(() => {
            setDrawn(true);
        });

        // Wait for the transition to finish
        const timeout = setTimeout(() => {
            if (onAnimationEnd) onAnimationEnd();
        }, 350); // Matches --duration-normal

        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timeout);
        };
    }, [animate, onAnimationEnd]);

    const style = {
        strokeDasharray: 48,
        strokeDashoffset: drawn ? 0 : 48,
        transition: 'stroke-dashoffset var(--duration-fast, 200ms) var(--ease-bounce, cubic-bezier(0.175, 0.885, 0.32, 1.275))',
    };

    return (
        <svg
            className="check-path-svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ overflow: 'visible' }}
        >
            <path
                className={`check-path ${drawn ? 'drawn' : ''}`}
                d="M4 12l4 4L20 6"
                style={style}
            />
        </svg>
    );
}
