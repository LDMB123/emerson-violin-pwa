export const mergeControllerElements = (createEmptyElements, nextElements) => ({
    ...createEmptyElements(),
    ...(nextElements || {}),
});
