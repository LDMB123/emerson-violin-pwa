import React, { useEffect, useState } from 'react';

export function StarRating({ rating = 0, isNewEarn = false }) {
    const stars = [1, 2, 3, 4, 5];

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {stars.map((star, index) => {
                const filled = star <= rating;
                // If it's a new earn and it's filled, animate it.
                // We apply a stagger based on index.
                const delay = isNewEarn ? index * 150 + 'ms' : '0ms';

                return (
                    <div
                        key={star}
                        style={{ position: 'relative', width: 40, height: 40 }}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="40"
                            height="40"
                            style={{
                                fill: filled ? 'var(--color-warning)' : 'transparent',
                                stroke: filled ? 'var(--color-warning)' : 'var(--color-text-muted)',
                                strokeWidth: 2,
                                opacity: filled ? 1 : 0.3,
                                transform: filled && isNewEarn ? 'scale(0)' : 'scale(1)',
                                animation: filled && isNewEarn ? `star-pop var(--duration-celebration) var(--ease-spring) forwards` : 'none',
                                animationDelay: delay
                            }}
                        >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round" />
                        </svg>
                        {filled && isNewEarn && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    borderRadius: '50%',
                                    animation: `glow-ring 0.6s var(--ease-out) forwards`,
                                    animationDelay: delay,
                                    // Initially hidden until animation runs
                                    opacity: 0,
                                    transform: 'scale(0.5)',
                                    pointerEvents: 'none'
                                }}
                                className="star-glow"
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
