import { describe, expect, it } from 'vitest';
import {
    findElementsByTag,
    findFirstElementById,
    normalizeMarkup,
    parseAttributes,
    stripTags,
} from '../../scripts/html-audit-utils.mjs';

describe('html-audit-utils', () => {
    it('parses mixed quoted and boolean attributes', () => {
        expect(parseAttributes('id="tempo" data-track=main hidden aria-label=\'Tempo\'')).
            toEqual({
                id: 'tempo',
                'data-track': 'main',
                hidden: '',
                'aria-label': 'Tempo',
            });
    });

    it('finds nested elements by tag', () => {
        const html = `
            <label class="setting-row">
                <span>Enable coach voice</span>
                <input id="coach-voice" type="checkbox">
            </label>
        `;

        const labels = findElementsByTag(html, 'label');
        const inputs = findElementsByTag(html, 'input');

        expect(labels).toHaveLength(1);
        expect(inputs).toHaveLength(1);
        expect(inputs[0].start).toBeGreaterThan(labels[0].start);
        expect(inputs[0].end).toBeLessThan(labels[0].end);
    });

    it('finds an element by id and preserves its outer markup', () => {
        const html = `
            <main>
                <section class="view" id="view-home" aria-label="Home">
                    <h1>Ready</h1>
                </section>
            </main>
        `;

        expect(findFirstElementById(html, 'view-home')).toMatchObject({
            tagName: 'section',
            attrs: {
                class: 'view',
                id: 'view-home',
                'aria-label': 'Home',
            },
        });
    });

    it('ignores tags inside HTML comments during scans', () => {
        const html = `
            <!-- <img src="./assets/illustrations/ghost.webp"> -->
            <section class="view" id="view-home" aria-label="Home">
                <img src="./assets/illustrations/mascot-happy.webp" alt="">
            </section>
        `;

        const images = findElementsByTag(html, 'img');

        expect(images).toHaveLength(1);
        expect(images[0].attrs.src).toContain('mascot-happy.webp');
    });

    it('normalizes markup and strips text content predictably', () => {
        const markup = `
            <section class="view" id="view-home">
                <!-- comment -->
                <button><span> Start </span></button>
            </section>
        `;

        expect(normalizeMarkup(markup)).
            toBe('<section class="view" id="view-home"><button><span> Start </span></button></section>');
        expect(stripTags(markup)).toContain('Start');
    });
});
