import { defineConfig } from 'vite';
import { resolve } from 'path';

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

export default defineConfig({
    root: '.',
    base: './',
    publicDir: 'public',

    build: {
        target: 'es2022',
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
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

    plugins: [devServiceWorkerPlugin()],
});
