import React, { forwardRef } from 'react';
import { spacing } from '../../styles/theme.js';

/**
 * A premium Container component mapped to the "Liquid Glass" design tokens.
 * 
 * @param {Object} props
 * @param {boolean} [props.glass=true] - Applies the ultra-premium glassmorphism backdrop
 * @param {'1' | '2' | '3' | '4' | '5' | '6' | 'none'} [props.padding='4'] - Applies spacing token padding
 * @param {string} [props.as='div']
 * @param {string} [props.className]
 */
export const Card = forwardRef(({
    glass = true,
    padding = '4',
    as = 'div',
    className = '',
    style = {},
    children,
    ...rest
}, ref) => {
    const Element = as;
    const classes = [];

    if (glass) {
        classes.push('glass');
    }

    // Add any manual class overrides
    if (className) {
        classes.push(className);
    }

    const mergedStyles = { ...style };
    if (padding !== 'none' && spacing[padding]) {
        mergedStyles.padding = spacing[padding];
    }

    return (
        <Element
            ref={ref}
            className={classes.join(' ')}
            style={Object.keys(mergedStyles).length ? mergedStyles : undefined}
            {...rest}
        >
            {children}
        </Element>
    );
});

Card.displayName = 'Card';
