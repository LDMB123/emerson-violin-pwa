import { describe, expect, it } from 'vitest';
import { auditAccessibilityMarkup } from '../../scripts/audit-accessibility.mjs';

describe('audit-accessibility', () => {
    it('reports common accessibility failures in view markup', () => {
        const html = `
            <section class="view" id="view-home">
                <img src="./assets/illustrations/mascot-happy.webp">
                <dialog aria-labelledby="missing-title"></dialog>
                <input id="player-name">
                <div role="progressbar" aria-valuemin="0" aria-valuemax="100"></div>
            </section>
        `;

        const failures = auditAccessibilityMarkup('public/views/home.html', html);

        expect(failures).toContain('public/views/home.html: section#view-home is missing aria-label');
        expect(failures).toContain('public/views/home.html: img is missing alt attribute');
        expect(failures).toContain('public/views/home.html: dialog references missing label id "missing-title"');
        expect(failures).toContain('public/views/home.html: input#player-name is missing label');
        expect(failures).toContain('public/views/home.html: progressbar is missing aria-valuenow');
    });

    it('accepts labeled controls and named dialogs', () => {
        const html = `
            <section class="view" id="view-coach" aria-label="Practice Coach">
                <h2 id="dialog-title">Coach help</h2>
                <dialog aria-labelledby="dialog-title"></dialog>
                <label for="tempo">Tempo</label>
                <input id="tempo" type="text">
                <button type="button">Start</button>
                <a href="#view-home" aria-label="Go home"></a>
                <img src="./assets/illustrations/mascot-happy.webp" alt="">
                <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div>
            </section>
        `;

        expect(auditAccessibilityMarkup('public/views/coach.html', html)).toEqual([]);
    });
});
