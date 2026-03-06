#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
    findElementsByTag,
    findFirstElementById,
    normalizeWhitespace,
    parseAttributes,
    stripTags,
} from './html-audit-utils.mjs';

const rootDir = process.cwd();
const viewsDir = path.join(rootDir, 'public', 'views');
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

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

const getInnerText = (element) => stripTags(element?.innerHtml || '');
const getDescendantImageAltText = (element) => normalizeWhitespace(
    findElementsByTag(element?.innerHtml || '', 'img')
        .map((img) => normalizeWhitespace(img.attrs.alt))
        .filter(Boolean)
        .join(' ')
);

const hasWrappingLabel = (element, labels) => labels.some((label) => (
    element.start > label.start
    && element.end < label.end
    && Boolean(getInnerText(label))
));

const hasReferencedLabel = (element, labels, getTextById) => {
    const id = element.attrs.id;
    if (id) {
        const direct = labels.find((label) => label.attrs.for === id);
        if (direct && getInnerText(direct)) return true;
    }

    const labelledBy = normalizeWhitespace(element.attrs['aria-labelledby']);
    if (!labelledBy) return false;
    const text = labelledBy
        .split(/\s+/)
        .map((ref) => getTextById(ref))
        .filter(Boolean)
        .join(' ');
    return Boolean(text);
};

const hasAccessibleName = (element, labels, getTextById) => {
    const ariaLabel = normalizeWhitespace(element.attrs['aria-label']);
    if (ariaLabel) return true;
    if (hasReferencedLabel(element, labels, getTextById)) return true;
    if (hasWrappingLabel(element, labels)) return true;

    const text = getInnerText(element);
    if (text) return true;

    const descendantImageAltText = getDescendantImageAltText(element);
    if (descendantImageAltText) return true;

    const title = normalizeWhitespace(element.attrs.title);
    return Boolean(title);
};

export const auditAccessibilityMarkup = (relativePath, html) => {
    const failures = [];
    const labels = findElementsByTag(html, 'label');
    const idTextCache = new Map();

    const getTextById = (id) => {
        if (!id) return '';
        if (idTextCache.has(id)) return idTextCache.get(id);
        const element = findFirstElementById(html, id);
        const text = element ? getInnerText(element) : '';
        idTextCache.set(id, text);
        return text;
    };

    findElementsByTag(html, 'section')
        .filter((section) => String(section.attrs.class || '').split(/\s+/).includes('view'))
        .forEach((section) => {
            const id = section.attrs.id || '<missing-id>';
            const ariaLabel = normalizeWhitespace(section.attrs['aria-label']);
            if (!ariaLabel) {
                failures.push(`${relativePath}: section#${id} is missing aria-label`);
            }
        });

    findElementsByTag(html, 'img').forEach((img) => {
        if (!Object.prototype.hasOwnProperty.call(img.attrs, 'alt')) {
            failures.push(`${relativePath}: img is missing alt attribute`);
        }
    });

    findElementsByTag(html, 'dialog').forEach((dialog) => {
        const labelledBy = normalizeWhitespace(dialog.attrs['aria-labelledby']);
        if (!labelledBy) {
            failures.push(`${relativePath}: dialog is missing aria-labelledby`);
            return;
        }
        const missingRef = labelledBy
            .split(/\s+/)
            .find((id) => !getTextById(id));
        if (missingRef) {
            failures.push(`${relativePath}: dialog references missing label id "${missingRef}"`);
        }
    });

    const interactiveElements = [
        ...findElementsByTag(html, 'button'),
        ...findElementsByTag(html, 'a').filter((element) => Boolean(element.attrs.href)),
        ...findElementsByTag(html, 'input'),
        ...findElementsByTag(html, 'select'),
        ...findElementsByTag(html, 'textarea'),
    ];

    interactiveElements.forEach((element) => {
        const tag = element.tagName;
        if (tag === 'input') {
            const type = String(element.attrs.type || 'text').toLowerCase();
            if (type === 'hidden') return;
            if (Object.prototype.hasOwnProperty.call(element.attrs, 'hidden')) return;
            if (String(element.attrs['aria-hidden'] || '').toLowerCase() === 'true') return;
            if (['submit', 'button', 'reset'].includes(type)) {
                if (!hasAccessibleName(element, labels, getTextById) && !normalizeWhitespace(element.attrs.value)) {
                    failures.push(`${relativePath}: input[type=${type}] is missing accessible name`);
                }
                return;
            }
            if (!hasAccessibleName(element, labels, getTextById)) {
                failures.push(`${relativePath}: input${element.attrs.id ? `#${element.attrs.id}` : ''} is missing label`);
            }
            return;
        }

        if (!hasAccessibleName(element, labels, getTextById)) {
            const descriptor = element.attrs.id ? `${tag}#${element.attrs.id}` : tag;
            failures.push(`${relativePath}: ${descriptor} is missing accessible name`);
        }
    });

    const commentSafeHtml = String(html).replace(COMMENT_PATTERN, (comment) => comment.replace(/[^\r\n]/g, ' '));
    const progressbarRegex = /<([a-zA-Z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
    let progressbarMatch = progressbarRegex.exec(commentSafeHtml);
    while (progressbarMatch) {
        const attrs = parseAttributes(progressbarMatch[2] || '');
        if (attrs.role === 'progressbar') {
            ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'].forEach((attr) => {
                if (!Object.prototype.hasOwnProperty.call(attrs, attr)) {
                    failures.push(`${relativePath}: progressbar is missing ${attr}`);
                }
            });
        }
        progressbarMatch = progressbarRegex.exec(commentSafeHtml);
    }

    return failures;
};

const auditFile = (filePath) => {
    const relativePath = path.relative(rootDir, filePath);
    const html = fs.readFileSync(filePath, 'utf8');
    return auditAccessibilityMarkup(relativePath, html);
};

if (!fs.existsSync(viewsDir)) {
    console.error('Accessibility audit failed: public/views directory not found.');
    process.exit(1);
}

const htmlFiles = collectHtmlFiles(viewsDir);
const failures = htmlFiles.flatMap(auditFile);

if (failures.length) {
    console.error('Accessibility audit failed:');
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
}

console.log(`Accessibility audit passed for ${htmlFiles.length} HTML view files.`);
