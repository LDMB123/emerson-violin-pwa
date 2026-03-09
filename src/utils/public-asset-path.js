const ABSOLUTE_ASSET_PATTERN = /^(?:[a-z]+:|\/\/|data:|blob:|#)/i;

const normalizeBasePath = (basePath = '/') => (basePath.endsWith('/') ? basePath : `${basePath}/`);

export const getPublicAssetPath = (assetPath = '', basePath = import.meta.env.BASE_URL || '/') => {
    if (!assetPath || ABSOLUTE_ASSET_PATTERN.test(assetPath)) {
        return assetPath;
    }

    const normalizedBasePath = normalizeBasePath(basePath);
    if (assetPath.startsWith(normalizedBasePath) || (normalizedBasePath === '/' && assetPath.startsWith('/'))) {
        return assetPath;
    }

    const normalizedAssetPath = assetPath.replace(/^(?:\.\/|\/)+/, '');
    return `${normalizedBasePath}${normalizedAssetPath}`;
};
