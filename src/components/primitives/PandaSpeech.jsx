import React, { useState, useEffect, useRef } from 'react';

/**
 * PandaSpeech — Mascot speech bubble with word-by-word reveal (spec 2671-2676).
 *
 * Text animates in word-by-word (30ms per word) for a "speaking" feel.
 * aria-live="polite" for screen reader announcements.
 * Sizes: sm (inline coaching strip), md (card-embedded), lg (full-width hero).
 *
 * @param {object} props
 * @param {string} props.text - Speech text to display
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Display size variant
 * @param {string} [props.pose] - Mascot pose (for potential image switching)
 * @param {boolean} [props.animate=true] - Whether to animate word-by-word
 */
export function PandaSpeech({ text, size = 'md', pose, animate = true }) {
    const [visibleCount, setVisibleCount] = useState(animate ? 0 : Infinity);
    const timeoutRef = useRef(null);
    const words = text ? text.split(/\s+/) : [];

    useEffect(() => {
        if (!animate || !text) {
            setVisibleCount(Infinity);
            return;
        }

        setVisibleCount(0);
        let count = 0;

        const reveal = () => {
            count++;
            setVisibleCount(count);
            if (count < words.length) {
                timeoutRef.current = setTimeout(reveal, 30);
            }
        };

        timeoutRef.current = setTimeout(reveal, 200); // Initial pause before speaking

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [text, animate]);

    const sizeStyles = {
        sm: { fontSize: '0.9rem', padding: '8px 12px', maxWidth: '280px' },
        md: { fontSize: '1.1rem', padding: '12px 16px', maxWidth: '340px' },
        lg: { fontSize: '1.4rem', padding: '16px 20px', maxWidth: '420px', textAlign: 'center' },
    };

    const currentStyle = sizeStyles[size] || sizeStyles.md;

    return (
        <div
            className="panda-speech-bubble"
            aria-live="polite"
            style={{
                position: 'relative',
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08))',
                fontFamily: 'var(--font-display, Fredoka, sans-serif)',
                color: 'var(--color-text, #352019)',
                lineHeight: 1.4,
                ...currentStyle,
            }}
        >
            {/* Speech bubble pointer */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '24px',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: '8px solid rgba(255,255,255,0.92)',
                }}
            />

            {/* Word-by-word reveal */}
            <span>
                {words.map((word, i) => (
                    <span
                        key={`${word}-${i}`}
                        style={{
                            opacity: i < visibleCount ? 1 : 0,
                            transition: 'opacity 0.1s ease-out',
                            display: 'inline',
                        }}
                    >
                        {word}{i < words.length - 1 ? ' ' : ''}
                    </span>
                ))}
            </span>

            {/* Invisible full text for screen readers */}
            <span className="sr-only">{text}</span>
        </div>
    );
}
