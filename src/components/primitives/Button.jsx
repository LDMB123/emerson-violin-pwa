import React, { forwardRef } from 'react';

/**
 * A highly accessible, PhilharMagic-themed Button primitive.
 * Supports rendering as a standard `<button>` or, if `href` is provided, an `<a>` tag.
 * 
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'none'} [props.variant='primary']
 * @param {'sm' | 'md' | 'giant'} [props.size='md']
 * @param {string} [props.className] - Optional extra CSS classes
 * @param {string} [props.href] - If provided, renders an <a> tag instead of <button>
 * @param {boolean} [props.disabled] - Disables the button visually and functionally
 */
export const Button = forwardRef(({
    variant = 'primary',
    size = 'md',
    className = '',
    href,
    disabled = false,
    children,
    ...rest
}, ref) => {
    // Base classes from app.css
    const classes = ['btn'];

    // Variant mapping
    if (variant === 'primary') classes.push('btn-primary');
    else if (variant === 'secondary') classes.push('btn-secondary');
    else if (variant === 'ghost') classes.push('btn-ghost');

    // Size mapping 
    if (size === 'sm') classes.push('btn-sm');
    else if (size === 'giant') classes.push('btn-giant');

    if (className) {
        classes.push(className);
    }

    const Element = href ? 'a' : 'button';
    const linkProps = href ? { href } : {};
    const buttonProps = !href ? { disabled } : {};

    return (
        <Element
            ref={ref}
            className={classes.join(' ')}
            aria-disabled={disabled ? 'true' : undefined}
            {...linkProps}
            {...buttonProps}
            {...rest}
        >
            {children}
        </Element>
    );
});

Button.displayName = 'Button';
