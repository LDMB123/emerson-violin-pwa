import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Environment for DOM testing
        environment: 'happy-dom',

        // Include test files
        include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'],

        // Exclude E2E tests (run via Playwright)
        exclude: ['tests/e2e/**'],

        // Stabilize browser storage APIs across supported Node runtimes.
        setupFiles: ['tests/setup/happy-dom-storage-shim.js', 'tests/setup-rtl.js'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: ['src/**/*.{js,jsx}'],
            exclude: ['src/**/*.test.{js,jsx}'],
        },

        // Global setup
        globals: true,

        // Timeout for async tests
        testTimeout: 10000,
    },
});
