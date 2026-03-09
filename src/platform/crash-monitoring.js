let sentryModulePromise = null;

const shouldEnableCrashMonitoring = () => {
    return Boolean(import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN);
};

const sanitizeEvent = (event) => {
    if (!event || typeof event !== 'object') return event;

    delete event.user;
    if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
    }

    if (Array.isArray(event.breadcrumbs)) {
        event.breadcrumbs = event.breadcrumbs.filter((breadcrumb) => {
            const category = breadcrumb?.category || '';
            return !category.startsWith('ui.');
        });
    }

    return event;
};

const loadSentry = async () => {
    if (!sentryModulePromise) {
        sentryModulePromise = import('@sentry/react');
    }
    return sentryModulePromise;
};

export const initCrashMonitoring = async () => {
    if (!shouldEnableCrashMonitoring()) {
        return null;
    }

    const Sentry = await loadSentry();
    const release = import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_RELEASE || 'development';

    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        release,
        environment: import.meta.env.MODE || 'production',
        sendDefaultPii: false,
        maxBreadcrumbs: 20,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        beforeSend: sanitizeEvent,
        beforeBreadcrumb: (breadcrumb) => {
            if (breadcrumb?.category?.startsWith?.('ui.')) {
                return null;
            }
            return breadcrumb;
        },
    });

    return Sentry;
};

export const createReactRootOptions = (Sentry) => {
    if (!Sentry || typeof Sentry.reactErrorHandler !== 'function') {
        return undefined;
    }

    return {
        onUncaughtError: Sentry.reactErrorHandler(),
        onRecoverableError: Sentry.reactErrorHandler(),
    };
};
