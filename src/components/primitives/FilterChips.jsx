import React from 'react';

/**
 * FilterChips — Horizontal scrollable pill buttons (spec 2704-2709).
 *
 * Single-select or multi-select mode.
 * Active: filled bg in contextual color, white text.
 * Inactive: outlined, transparent bg.
 * Scroll snap for touch friendliness.
 *
 * @param {object} props
 * @param {Array<{id: string, label: string}>} props.options
 * @param {string|string[]} props.value - Selected ID(s)
 * @param {Function} props.onChange - Called with new value
 * @param {boolean} [props.multi=false] - Multi-select mode
 * @param {string} [props.color='var(--color-primary)'] - Active chip color
 */
export function FilterChips({ options = [], value, onChange, multi = false, color = 'var(--color-primary)' }) {
    const selected = multi
        ? (Array.isArray(value) ? value : [])
        : value;

    const isSelected = (id) => multi
        ? selected.includes(id)
        : selected === id;

    const handleClick = (id) => {
        if (multi) {
            const arr = Array.isArray(selected) ? selected : [];
            const next = arr.includes(id)
                ? arr.filter(v => v !== id)
                : [...arr, id];
            onChange(next);
        } else {
            onChange(id);
        }
    };

    return (
        <div
            className="filter-chips"
            style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                padding: '4px 0',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
            }}
        >
            {options.map(opt => {
                const active = isSelected(opt.id);
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleClick(opt.id)}
                        style={{
                            scrollSnapAlign: 'start',
                            flexShrink: 0,
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-full, 999px)',
                            border: `2px solid ${active ? color : 'var(--color-border, #e0d5cc)'}`,
                            background: active ? color : 'transparent',
                            color: active ? '#fff' : 'var(--color-text, #352019)',
                            fontFamily: 'var(--font-display, Fredoka, sans-serif)',
                            fontSize: '0.9rem',
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                            outline: 'none',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
