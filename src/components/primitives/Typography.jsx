import React, { forwardRef } from 'react';

/**
 * A Typography primitive that enforces the "Fredoka WOW Scale".
 * Ensures text maintains consistent scale, line-height, and tracking across the PWA.
 * 
 * @param {Object} props
 * @param {'h1' | 'h2' | 'h3' | 'p' | 'span'} [props.variant='p'] - The standard textual variant
 * @param {string} [props.as] - Optional override for the HTML element rendered (e.g., variant='h1' as='h2')
 * @param {string} [props.color] - A CSS variable alias for color (e.g., 'var(--color-text-muted)')
 * @param {'left' | 'center' | 'right'} [props.align]
 * @param {string} [props.className]
 */
export const Typography = forwardRef(({
    variant = 'p',
    as,
    color,
    align,
    className = '',
    style = {},
    children,
    ...rest
}, ref) => {
    const variantTagMap = {
        'body': 'p',
        'h1': 'h1',
        'h2': 'h2',
        'h3': 'h3',
        'p': 'p',
        'span': 'span'
    };
    const Element = as || variantTagMap[variant] || 'p';

    // Apply inline CSS mappings that respect the CSS-first token system
    const mergedStyles = { ...style };
    if (color) mergedStyles.color = color;
    if (align) mergedStyles.textAlign = align;

    // We rely primarily on `app.css` element selectors for h1, h2, h3, p bases.
    // If we wanted to map variants directly to custom classes, we'd do it here.
    const classes = [];
    if (className) {
        classes.push(className);
    }

    return (
        <Element
            ref={ref}
            className={classes.length ? classes.join(' ') : undefined}
            style={Object.keys(mergedStyles).length ? mergedStyles : undefined}
            {...rest}
        >
            {children}
        </Element>
    );
});

Typography.displayName = 'Typography';
