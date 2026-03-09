import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config.js';

const baseURL = process.env.PW_BASE_URL || process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
    ...baseConfig,
    use: {
        ...(baseConfig.use || {}),
        baseURL,
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'Desktop Chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'iPad Safari',
            use: { ...devices['iPad Pro 11'] },
        },
    ],
    webServer: undefined,
});
