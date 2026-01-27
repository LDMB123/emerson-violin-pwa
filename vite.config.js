import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    base: './',
    publicDir: 'public',

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@modules': resolve(__dirname, 'src/modules'),
            '@styles': resolve(__dirname, 'src/styles'),
            '@ml': resolve(__dirname, 'src/ml'),
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

    server: {
        port: 5173,
        host: true,
    },

    plugins: [],
});
