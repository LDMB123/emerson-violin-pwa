const templateCache = new Map();

const resolveTemplate = (templateOrId) => {
    if (!templateOrId) return null;
    if (templateOrId instanceof HTMLTemplateElement) return templateOrId;
    if (typeof templateOrId !== 'string') return null;
    const id = templateOrId.startsWith('#') ? templateOrId : `#${templateOrId}`;
    if (templateCache.has(id)) return templateCache.get(id);
    const template = document.querySelector(id);
    if (template instanceof HTMLTemplateElement) {
        templateCache.set(id, template);
        return template;
    }
    return null;
};

export const cloneTemplate = (templateOrId) => {
    const template = resolveTemplate(templateOrId);
    if (!template?.content) return null;
    const fragment = template.content.cloneNode(true);
    return fragment.firstElementChild;
};

export const ensureTemplateInstance = (container, { selector, templateId, className } = {}) => {
    if (!container) return null;
    if (selector) {
        const existing = container.querySelector(selector);
        if (existing) return existing;
    }
    let element = cloneTemplate(templateId);
    if (!element && className) {
        element = document.createElement('span');
        element.className = className;
    }
    if (element) container.appendChild(element);
    return element;
};

export const ensureDifficultyBadge = (container, { prefix } = {}) => {
    const badge = ensureTemplateInstance(container, {
        selector: '.difficulty-badge',
        templateId: '#difficulty-badge-template',
        className: 'difficulty-badge',
    });
    if (badge && prefix) badge.dataset.prefix = prefix;
    return badge;
};
