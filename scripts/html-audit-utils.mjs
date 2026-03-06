const VOID_TAGS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
]);

const TAG_BODY_PATTERN = "(?:\"[^\"]*\"|'[^']*'|[^'\">])*";
const ATTRIBUTE_PATTERN = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

const maskHtmlComments = (value = '') => String(value).replace(COMMENT_PATTERN, (comment) => (
    comment.replace(/[^\r\n]/g, ' ')
));

export const normalizeWhitespace = (value = '') => String(value).replace(/\s+/g, ' ').trim();

export const decodeHtmlEntities = (value = '') => String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

export const stripTags = (value = '') => normalizeWhitespace(
    decodeHtmlEntities(
        String(value)
            .replace(COMMENT_PATTERN, ' ')
            .replace(/<[^>]+>/g, ' ')
    )
);

export const parseAttributes = (source = '') => {
    const attributes = {};
    let match = ATTRIBUTE_PATTERN.exec(source);
    while (match) {
        const name = String(match[1] || '').toLowerCase();
        const value = match[2] ?? match[3] ?? match[4] ?? '';
        if (name) attributes[name] = value;
        match = ATTRIBUTE_PATTERN.exec(source);
    }
    ATTRIBUTE_PATTERN.lastIndex = 0;
    return attributes;
};

const buildTagRegex = (tagName) => new RegExp(
    `<(/?)${tagName}\\b(${TAG_BODY_PATTERN})>`,
    'gi'
);

export const findElementsByTag = (html, tagName) => {
    const normalizedTagName = String(tagName || '').toLowerCase();
    if (!normalizedTagName) return [];

    const source = maskHtmlComments(html);
    const regex = buildTagRegex(normalizedTagName);
    const elements = [];
    const stack = [];
    let match = regex.exec(source);

    while (match) {
        const closing = match[1] === '/';
        const rawAttributes = match[2] || '';
        const start = match.index;
        const end = regex.lastIndex;
        const outerHtml = html.slice(start, end);
        const selfClosing = VOID_TAGS.has(normalizedTagName) || /\/\s*>$/.test(outerHtml);

        if (closing) {
            const open = stack.pop();
            if (open) {
                elements.push({
                    tagName: normalizedTagName,
                    attrs: open.attrs,
                    start: open.start,
                    end,
                    innerHtml: html.slice(open.openEnd, start),
                    outerHtml: html.slice(open.start, end),
                });
            }
            match = regex.exec(source);
            continue;
        }

        const attrs = parseAttributes(rawAttributes);
        if (selfClosing) {
            elements.push({
                tagName: normalizedTagName,
                attrs,
                start,
                end,
                innerHtml: '',
                outerHtml,
            });
        } else {
            stack.push({
                start,
                openEnd: end,
                attrs,
            });
        }

        match = regex.exec(source);
    }

    return elements.sort((left, right) => left.start - right.start);
};

export const findFirstElementById = (html, id) => {
    const wantedId = String(id || '');
    if (!wantedId) return null;

    const source = maskHtmlComments(html);
    const openingTagPattern = new RegExp(`<([a-zA-Z][\\w:-]*)\\b(${TAG_BODY_PATTERN})>`, 'gi');
    let match = openingTagPattern.exec(source);
    while (match) {
        const tagName = String(match[1] || '').toLowerCase();
        const attrs = parseAttributes(match[2] || '');
        if (attrs.id === wantedId) {
            const start = match.index;
            const candidates = findElementsByTag(html, tagName);
            return candidates.find((element) => element.start === start) || null;
        }
        match = openingTagPattern.exec(source);
    }

    return null;
};

export const normalizeMarkup = (markup = '') => String(markup)
    .replace(/\r\n/g, '\n')
    .replace(COMMENT_PATTERN, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
