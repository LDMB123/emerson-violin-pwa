import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../../src/components/primitives/Button.jsx';
import { Typography } from '../../src/components/primitives/Typography.jsx';
import { Card } from '../../src/components/primitives/Card.jsx';
import { spacing } from '../../src/styles/theme.js';

describe('Design System Primitives', () => {

    describe('Button', () => {
        it('renders a default primary button', () => {
            render(<Button>Click Me</Button>);
            const btn = screen.getByRole('button', { name: 'Click Me' });
            expect(btn).toBeInTheDocument();
            expect(btn).toHaveClass('btn');
            expect(btn).toHaveClass('btn-primary');
            // 'btn-md' is the default size implicit in .btn
        });

        it('renders a link when href is passed', () => {
            render(<Button href="https://example.com" variant="ghost">Link Button</Button>);
            const link = screen.getByRole('link', { name: 'Link Button' });
            expect(link).toHaveAttribute('href', 'https://example.com');
            expect(link).toHaveClass('btn');
            expect(link).toHaveClass('btn-ghost');
        });

        it('disables correctly', () => {
            render(<Button disabled>Disabled</Button>);
            const btn = screen.getByRole('button', { name: 'Disabled' });
            expect(btn).toBeDisabled();
            expect(btn).toHaveAttribute('aria-disabled', 'true');
        });
    });

    describe('Typography', () => {
        it('renders different HTML tags based on variant or as prop', () => {
            const { container: container1 } = render(<Typography variant="h1">Header</Typography>);
            expect(container1.querySelector('h1')).toBeInTheDocument();

            const { container: container2 } = render(<Typography variant="p" as="span">Span Text</Typography>);
            expect(container2.querySelector('span')).toBeInTheDocument();
        });

        it('applies inline color styles', () => {
            render(<Typography color="var(--color-primary)">Colored</Typography>);
            const el = screen.getByText('Colored');
            expect(el.getAttribute('style')).toContain('color:');
            expect(el.getAttribute('style')).toContain('var(--color-primary)');
        });
    });

    describe('Card', () => {
        it('applies the glassmorphism class by default', () => {
            render(<Card data-testid="card">Content</Card>);
            const card = screen.getByTestId('card');
            expect(card).toHaveClass('glass');
        });

        it('maps padding prop to theme tokens', () => {
            render(<Card data-testid="card" padding="6">Spaced</Card>);
            const card = screen.getByTestId('card');
            expect(card.getAttribute('style')).toContain('padding:');
            expect(card.getAttribute('style')).toContain(spacing['6']);
        });

        it('omits glass class if requested', () => {
            render(<Card data-testid="card" glass={false}>Flat</Card>);
            const card = screen.getByTestId('card');
            expect(card).not.toHaveClass('glass');
        });
    });

});
