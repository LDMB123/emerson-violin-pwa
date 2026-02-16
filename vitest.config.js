import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Environment for DOM testing
        environment: 'happy-dom',

        // Include test files
        include: ['src/**/*.test.js', 'tests/**/*.test.js'],

        // Exclude E2E tests (run via Playwright)
        exclude: ['tests/e2e/**'],

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
