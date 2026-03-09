import { defineConfig, devices } from '@playwright/test';

const configuredWorkers = Number.parseInt(
    process.env.PW_WORKERS || (process.env.CI ? '1' : '2'),
    10,
);
const baseURL = process.env.PW_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const baseHost = (() => {
    try {
        return new URL(baseURL).hostname;
    } catch {
        return 'localhost';
    }
})();
const useWebServer = process.env.PW_SKIP_WEBSERVER !== 'true'
    && (baseHost === 'localhost' || baseHost === '127.0.0.1');

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: Number.isNaN(configuredWorkers) ? (process.env.CI ? 1 : 2) : configuredWorkers,
    reporter: 'list',
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'iPad Safari',
            use: { ...devices['iPad Pro 11'] },
        },
    ],
    webServer: useWebServer ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
    } : undefined,
});
