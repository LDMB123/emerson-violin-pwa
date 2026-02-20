import { describe, expect, it } from 'vitest';
import {
    extractInlineHomeView,
    normalizeViewMarkup,
    isHomeViewSynced,
} from '../../scripts/audit-view-sync.mjs';

describe('audit-view-sync', () => {
    it('extracts inline view-home markup from index html', () => {
        const indexHtml = `
            <main>
                <section class="view" id="view-home"><div>Home</div></section>
                <section class="view" id="view-coach"><div>Coach</div></section>
            </main>
        `;

        const homeView = extractInlineHomeView(indexHtml);
        expect(homeView).toContain('id="view-home"');
        expect(homeView).toContain('<div>Home</div>');
    });

    it('normalizes equivalent markup with whitespace differences', () => {
        const compact = '<section class="view" id="view-home"><div>Home</div></section>';
        const formatted = `
            <section class="view" id="view-home">
                <div>Home</div>
            </section>
        `;

        expect(normalizeViewMarkup(compact)).toBe(normalizeViewMarkup(formatted));
    });

    it('reports home view sync parity correctly', () => {
        const inlineHome = '<section class="view" id="view-home"><h1>Ready</h1></section>';
        const sameRouteHome = `
            <section class="view" id="view-home">
                <h1>Ready</h1>
            </section>
        `;
        const changedRouteHome = '<section class="view" id="view-home"><h1>Different</h1></section>';

        expect(isHomeViewSynced(inlineHome, sameRouteHome)).toBe(true);
        expect(isHomeViewSynced(inlineHome, changedRouteHome)).toBe(false);
    });
});
