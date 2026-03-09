import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const configDir = fileURLToPath(new URL('.', import.meta.url));

const devServiceWorkerPlugin = () => ({
    name: 'dev-sw-bypass',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            if (req.url === '/sw.js' || req.url === '/sw-assets.js') {
                res.setHeader('Content-Type', 'application/javascript');
                res.setHeader('Cache-Control', 'no-store');
                if (req.url === '/sw-assets.js') {
                    res.end('self.__ASSETS__ = [];\n');
                    return;
                }
                res.end([
                    '// Dev-mode: self-destructing service worker',
                    'self.addEventListener("install", () => self.skipWaiting());',
                    'self.addEventListener("activate", (event) => {',
                    '  event.waitUntil((async () => {',
                    '    const keys = await caches.keys();',
                    '    await Promise.all(keys.map((k) => caches.delete(k)));',
                    '    await self.registration.unregister();',
                    '  })());',
                    '  self.clients.claim();',
                    '});',
                ].join('\n'));
                return;
            }
            next();
        });
    },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
    const basePath = env.VITE_APP_BASE_PATH
        || (process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/');
    const sentryEnabled = Boolean(
        env.SENTRY_AUTH_TOKEN
        && env.SENTRY_ORG
        && env.SENTRY_PROJECT
        && env.VITE_SENTRY_RELEASE,
    );

    const plugins = [devServiceWorkerPlugin(), react()];

    if (sentryEnabled) {
        plugins.push(
            sentryVitePlugin({
                org: env.SENTRY_ORG,
                project: env.SENTRY_PROJECT,
                authToken: env.SENTRY_AUTH_TOKEN,
                telemetry: false,
                silent: true,
                release: {
                    name: env.VITE_SENTRY_RELEASE,
                    create: true,
                    finalize: true,
                    inject: true,
                },
            }),
        );
    }

    return {
        root: '.',
        base: basePath,
        publicDir: 'public',

        build: {
            target: 'es2022',
            outDir: 'dist',
            sourcemap: true,
            rollupOptions: {
                input: {
                    main: resolve(configDir, 'index.html'),
                },
            },
        },

        server: {
            port: 5173,
            host: true,
            headers: {
                'Cache-Control': 'no-store',
            },
        },

        css: {
            modules: {
                localsConvention: 'camelCase',
            },
        },

        test: {
            include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'],
            globals: true,
            environment: 'happy-dom',
            setupFiles: ['./tests/setup-rtl.js'],
        },

        plugins,
    };
});
