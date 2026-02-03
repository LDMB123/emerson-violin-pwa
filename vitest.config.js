import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
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
    test: {
        // Environment for DOM testing
        environment: 'happy-dom',

        // Include test files
        include: ['src/**/*.test.js', 'tests/**/*.test.js', 'tests/unit/**/*.test.js'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.js'],
            exclude: ['src/**/*.test.js'],
        },

        // Global setup
        globals: true,

        // Timeout for async tests
        testTimeout: 10000,
    },
});
