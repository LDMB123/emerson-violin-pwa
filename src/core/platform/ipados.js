const IPADOS_UA = /iPad/;

export const isIPadOS = () => IPADOS_UA.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;

export const parseIPadOSVersion = () => {
    const match = navigator.userAgent.match(/OS (\d+)[_\.](\d+)/i);
    if (!match) return null;
    const major = Number.parseInt(match[1], 10);
    const minor = Number.parseInt(match[2], 10);
    if (Number.isNaN(major) || Number.isNaN(minor)) return null;
    return { major, minor, raw: `${major}.${minor}` };
};
