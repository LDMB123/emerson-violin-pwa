import { defineConfig, devices } from '@playwright/test';

const configuredWorkers = Number.parseInt(
    process.env.PW_WORKERS || (process.env.CI ? '1' : '2'),
    10,
);

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: Number.isNaN(configuredWorkers) ? (process.env.CI ? 1 : 2) : configuredWorkers,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'iPad Safari',
            use: { ...devices['iPad Pro 11'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
    },
});
