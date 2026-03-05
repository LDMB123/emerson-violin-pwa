export const mergeControllerElements = (createEmptyElements, nextElements) => ({
    ...createEmptyElements(),
    ...(nextElements || {}),
});

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
