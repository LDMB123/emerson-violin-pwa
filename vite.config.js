import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    base: './',
    publicDir: 'public',

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@core': resolve(__dirname, 'src/core'),
            '@features': resolve(__dirname, 'src/features'),
            '@assets': resolve(__dirname, 'src/assets'),
            '@styles': resolve(__dirname, 'src/styles'),
            '@data': resolve(__dirname, 'src/data'),
        },
    },

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

    worker: {
        format: 'es',
    },

    server: {
        port: 5173,
        host: true,
    },

    plugins: [],
});
