#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const rootDir = process.cwd();
const viewsDir = path.join(rootDir, 'public', 'views');
const failures = [];

const collectHtmlFiles = (dir) => {
    const files = [];
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop();
        const entries = fs.readdirSync(current, { withFileTypes: true });
        entries.forEach((entry) => {
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                return;
            }
            if (entry.isFile() && entry.name.endsWith('.html')) {
                files.push(fullPath);
            }
        });
    }
    return files;
};

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const hasWrappingLabel = ($el) => {
    const $label = $el.closest('label');
    if (!$label.length) return false;
    const text = normalizeWhitespace($label.text());
    return Boolean(text);
};

const hasReferencedLabel = ($el, $) => {
    const id = $el.attr('id');
    if (!id) return false;
    const direct = normalizeWhitespace($(`label[for="${id}"]`).first().text());
    if (direct) return true;
    const labelledBy = normalizeWhitespace($el.attr('aria-labelledby'));
    if (!labelledBy) return false;
    const text = labelledBy
        .split(/\s+/)
        .map((ref) => normalizeWhitespace($(`#${ref}`).text()))
        .filter(Boolean)
        .join(' ');
    return Boolean(text);
};

const hasAccessibleName = ($el, $) => {
    const ariaLabel = normalizeWhitespace($el.attr('aria-label'));
    if (ariaLabel) return true;
    if (hasReferencedLabel($el, $)) return true;
    if (hasWrappingLabel($el)) return true;

    const text = normalizeWhitespace($el.text());
    if (text) return true;

    const title = normalizeWhitespace($el.attr('title'));
    return Boolean(title);
};

const auditFile = (filePath) => {
    const relativePath = path.relative(rootDir, filePath);
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = load(html);

    $('section.view').each((_, section) => {
        const $section = $(section);
        const id = $section.attr('id') || '<missing-id>';
        const ariaLabel = normalizeWhitespace($section.attr('aria-label'));
        if (!ariaLabel) {
            failures.push(`${relativePath}: section#${id} is missing aria-label`);
        }
    });

    $('img').each((_, img) => {
        const $img = $(img);
        const altAttr = $img.attr('alt');
        if (typeof altAttr === 'undefined') {
            failures.push(`${relativePath}: img is missing alt attribute`);
        }
    });

    $('dialog').each((_, dialog) => {
        const $dialog = $(dialog);
        const labelledBy = normalizeWhitespace($dialog.attr('aria-labelledby'));
        if (!labelledBy) {
            failures.push(`${relativePath}: dialog is missing aria-labelledby`);
            return;
        }
        const missingRef = labelledBy
            .split(/\s+/)
            .find((id) => !$("#" + id).length);
        if (missingRef) {
            failures.push(`${relativePath}: dialog references missing label id "${missingRef}"`);
        }
    });

    $('button, a[href], input, select, textarea').each((_, element) => {
        const $el = $(element);
        const tag = element.tagName.toLowerCase();

        if (tag === 'input') {
            const type = ($el.attr('type') || 'text').toLowerCase();
            if (type === 'hidden') return;
            if (typeof $el.attr('hidden') !== 'undefined') return;
            if (($el.attr('aria-hidden') || '').toLowerCase() === 'true') return;
            if (['submit', 'button', 'reset'].includes(type)) {
                if (!hasAccessibleName($el, $) && !normalizeWhitespace($el.attr('value'))) {
                    failures.push(`${relativePath}: input[type=${type}] is missing accessible name`);
                }
                return;
            }
            if (!hasAccessibleName($el, $) && !hasReferencedLabel($el, $) && !hasWrappingLabel($el)) {
                failures.push(`${relativePath}: input${$el.attr('id') ? `#${$el.attr('id')}` : ''} is missing label`);
            }
            return;
        }

        if (!hasAccessibleName($el, $)) {
            const descriptor = $el.attr('id') ? `${tag}#${$el.attr('id')}` : tag;
            failures.push(`${relativePath}: ${descriptor} is missing accessible name`);
        }
    });

    $('[role="progressbar"]').each((_, node) => {
        const $node = $(node);
        ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'].forEach((attr) => {
            if (typeof $node.attr(attr) === 'undefined') {
                failures.push(`${relativePath}: progressbar is missing ${attr}`);
            }
        });
    });
};

if (!fs.existsSync(viewsDir)) {
    console.error('Accessibility audit failed: public/views directory not found.');
    process.exit(1);
}

const htmlFiles = collectHtmlFiles(viewsDir);
htmlFiles.forEach(auditFile);

if (failures.length) {
    console.error('Accessibility audit failed:');
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
}

console.log(`Accessibility audit passed for ${htmlFiles.length} HTML view files.`);
