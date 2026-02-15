import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'list',
    snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        serviceWorkers: 'block',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: /pwa-validation/,
        },
        {
            name: 'iPad Safari',
            use: { ...devices['iPad Pro 11'] },
            testIgnore: /pwa-validation/,
        },
        {
            name: 'sw-enabled',
            use: {
                ...devices['Desktop Chrome'],
                serviceWorkers: 'allow',
            },
            testMatch: /pwa-validation/,
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
