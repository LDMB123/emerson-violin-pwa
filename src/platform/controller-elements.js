/**
 * Merges a partial element bag over a fresh empty element shape.
 * This keeps missing keys stable even when the latest controller update omits them.
 *
 * @param {() => Record<string, unknown>} createEmptyElements
 * @param {Record<string, unknown> | null | undefined} nextElements
 * @returns {Record<string, unknown>}
 */
export const mergeControllerElements = (createEmptyElements, nextElements) => ({
    ...createEmptyElements(),
    ...(nextElements || {}),
});

/**
 * Creates a mutable element bag plus a setter that swaps in refreshed DOM references.
 * The returned proxy always resolves properties from the latest stored element map.
 *
 * @param {() => Record<string, unknown>} createEmptyElements
 * @returns {{ elements: Record<string, unknown>, setElements: (nextElements: Record<string, unknown> | null | undefined) => void }}
 */
export const createControllerElements = (createEmptyElements) => {
    let current = createEmptyElements();
    const elements = new Proxy({}, {
        get(_target, property) {
            return current[property];
        },
        set(_target, property, value) {
            current[property] = value;
            return true;
        },
    });

    const setElements = (nextElements) => {
        current = mergeControllerElements(createEmptyElements, nextElements);
    };

    return {
        elements,
        setElements,
    };
};
