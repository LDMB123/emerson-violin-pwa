/**
 * Design System Tokens
 * Maps to the CSS-First variables defined in src/styles/app.css (@layer tokens).
 * By referencing 'var(--token-name)', we preserve CSS's control over dark mode, media queries, and dynamic updates.
 */

export const colors = {
    // Primary Actions
    primary: 'var(--color-primary)',
    primaryLight: 'var(--color-primary-light)',
    primaryDark: 'var(--color-primary-dark)',
    secondary: 'var(--color-secondary)',

    // Status
    accent: 'var(--color-accent)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',

    // Neutrals
    bg: 'var(--color-bg)',
    bgAlt: 'var(--color-bg-alt)',
    surface: 'var(--color-surface)',
    text: 'var(--color-text)',
    textMuted: 'var(--color-text-muted)',

    // Brand
    brandBrown: 'var(--color-brand-brown)',
};

export const typography = {
    fonts: {
        display: 'var(--font-display)',
        main: 'var(--font-main)',
        body: 'var(--font-body)',
    },
    sizes: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
    },
    leading: {
        tight: 'var(--leading-tight)',
        snug: 'var(--leading-snug)',
        relaxed: 'var(--leading-relaxed)',
    },
    tracking: {
        tight: 'var(--tracking-tight)',
    }
};

export const spacing = {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    safeTop: 'var(--safe-top)',
    safeBottom: 'var(--safe-bottom)',
};

export const radius = {
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    full: 'var(--radius-full)',
};

export const effects = {
    glass: {
        bg: 'var(--glass-bg)',
        bgStrong: 'var(--glass-bg-strong)',
        border: 'var(--glass-border)',
        shadow: 'var(--glass-shadow)',
    },
    shadows: {
        sm: 'var(--shadow-sm)',
        lg: 'var(--elevation-lg)',
    },
    transitions: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        easeOut: 'var(--ease-out)',
        easeBounce: 'var(--ease-bounce)',
        easeSpring: 'var(--ease-spring)',
    }
};

const theme = {
    colors,
    typography,
    spacing,
    radius,
    effects,
};

export default theme;
