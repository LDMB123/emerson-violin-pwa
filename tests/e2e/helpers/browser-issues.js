import { expect } from '@playwright/test';

const shouldIgnoreBrowserIssue = (text, { ignoreLocalModuleLoadNoise = false } = {}) => {
    if (typeof text !== 'string') return false;
    if (text.includes('favicon.ico')) return true;
    if (!ignoreLocalModuleLoadNoise) return false;

    return (
        text.includes('due to access control checks.')
        || text.includes('Importing a module script failed.')
    );
};

export const collectBrowserIssues = (page, options = {}) => {
    const pageErrors = [];
    const consoleErrors = [];
    const combined = [];

    page.on('pageerror', (error) => {
        const text = error.message || String(error);
        if (shouldIgnoreBrowserIssue(text, options)) return;
        pageErrors.push(text);
        combined.push(`[pageerror] ${text}`);
    });

    page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (shouldIgnoreBrowserIssue(text, options)) return;
        consoleErrors.push(text);
        combined.push(`[console] ${text}`);
    });

    return {
        pageErrors,
        consoleErrors,
        flush(label) {
            expect(combined, `${label} emitted browser errors`).toEqual([]);
            combined.length = 0;
            pageErrors.length = 0;
            consoleErrors.length = 0;
        },
    };
};
