import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const host = process.env.PERF_BUDGET_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PERF_BUDGET_PORT || '4173', 10);
const baseUrl = process.env.PERF_BUDGET_BASE_URL || `http://${host}:${port}/#view-home`;
const sampleCount = Number.parseInt(process.env.PERF_BUDGET_SAMPLES || '3', 10);
const fcpBudgetMs = Number.parseFloat(process.env.PERF_BUDGET_FCP_MS || '2500');
const lcpBudgetMs = Number.parseFloat(process.env.PERF_BUDGET_LCP_MS || '3500');
const startupTimeoutMs = Number.parseInt(process.env.PERF_BUDGET_STARTUP_TIMEOUT_MS || '30000', 10);
const summaryOutputPath = process.env.PERF_BUDGET_OUTPUT || 'artifacts/perf-budget-summary.json';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
};

const formatMs = (value) => `${Math.round(value * 10) / 10}ms`;

const writeSummary = (summary) => {
    const outputPath = path.resolve(summaryOutputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    console.log(`Performance budget summary written to ${outputPath}`);
};

const getRelativeCdpMetricMs = (metrics, metricName) => {
    const values = new Map(metrics.map((metric) => [metric.name, metric.value]));
    const navigationStart = values.get('NavigationStart');
    const metricValue = values.get(metricName);
    if (!Number.isFinite(navigationStart) || !Number.isFinite(metricValue)) return null;
    if (metricValue < navigationStart) return null;
    return (metricValue - navigationStart) * 1000;
};

const startPreviewServer = () => {
    let stderr = '';
    const child = spawn(
        'npm',
        ['run', 'preview', '--', '--host', host, '--port', String(port)],
        {
            stdio: ['ignore', 'ignore', 'pipe'],
            env: { ...process.env, FORCE_COLOR: '0' },
        },
    );
    child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (stderr.length > 4000) {
            stderr = stderr.slice(-4000);
        }
    });
    return { child, getStderr: () => stderr };
};

const stopPreviewServer = async (child) => {
    if (!child || child.exitCode !== null) return;
    child.kill('SIGTERM');
    const deadline = Date.now() + 5000;
    while (child.exitCode === null && Date.now() < deadline) {
        await sleep(100);
    }
    if (child.exitCode === null) {
        child.kill('SIGKILL');
    }
};

const waitForPreviewServer = async ({ child, getStderr }) => {
    const readyUrl = `http://${host}:${port}/`;
    const deadline = Date.now() + startupTimeoutMs;
    let lastError = null;

    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(
                `Preview server exited before becoming ready (code ${child.exitCode}).\n${getStderr()}`,
            );
        }
        try {
            const response = await fetch(readyUrl);
            if (response.ok || response.status === 404) return;
        } catch (error) {
            lastError = error;
        }
        await sleep(250);
    }

    throw new Error(
        `Timed out waiting for preview server at ${readyUrl}.${lastError ? ` Last error: ${lastError.message}` : ''}`,
    );
};

const collectSample = async (browser, runIndex) => {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');

    await page.addInitScript(() => {
        window.__perfBudget = { lcp: null };
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const latest = entries[entries.length - 1];
                if (latest && Number.isFinite(latest.startTime)) {
                    window.__perfBudget.lcp = latest.startTime;
                }
            });
            observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {
            // Ignore unsupported observers.
        }
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(750);

    const metrics = await page.evaluate(() => {
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        const lastLcpEntry = lcpEntries[lcpEntries.length - 1];
        const fallbackLcp = lastLcpEntry && Number.isFinite(lastLcpEntry.startTime)
            ? lastLcpEntry.startTime
            : null;

        const fcp = Number.isFinite(fcpEntry?.startTime) ? fcpEntry.startTime : null;
        const lcpFromObserver = Number.isFinite(window.__perfBudget?.lcp) ? window.__perfBudget.lcp : null;
        const lcp = lcpFromObserver ?? fallbackLcp;

        return { fcp, lcp };
    });
    const cdpMetrics = await cdp.send('Performance.getMetrics');

    await context.close();

    const lcpFromCdp = getRelativeCdpMetricMs(cdpMetrics.metrics || [], 'FirstMeaningfulPaint');
    const lcp = Number.isFinite(metrics.lcp) ? metrics.lcp : lcpFromCdp;
    const lcpSource = Number.isFinite(metrics.lcp) ? 'lcp-entry' : (Number.isFinite(lcpFromCdp) ? 'fmp-fallback' : 'missing');

    if (!Number.isFinite(metrics.fcp) || !Number.isFinite(lcp)) {
        throw new Error(
            `Missing FCP/LCP metrics in sample ${runIndex}. Got ${JSON.stringify({
                fcp: metrics.fcp,
                lcp: metrics.lcp,
                lcpFromCdp,
            })}.`,
        );
    }

    return { fcp: metrics.fcp, lcp, lcpSource };
};

const run = async () => {
    console.log(`Performance budget audit starting (${sampleCount} samples @ ${baseUrl})`);
    console.log(`Budgets: FCP <= ${fcpBudgetMs}ms, LCP <= ${lcpBudgetMs}ms`);

    const preview = startPreviewServer();
    let browser = null;
    const summary = {
        startedAt: new Date().toISOString(),
        baseUrl,
        sampleCount,
        budgets: {
            fcpMs: fcpBudgetMs,
            lcpMs: lcpBudgetMs,
        },
        samples: [],
        medians: null,
        pass: false,
        failures: [],
        notes: [],
    };

    try {
        await waitForPreviewServer(preview);
        browser = await chromium.launch({ headless: true });

        const samples = [];
        for (let index = 0; index < sampleCount; index += 1) {
            const sample = await collectSample(browser, index + 1);
            samples.push(sample);
            summary.samples.push(sample);
            console.log(
                `Sample ${index + 1}: FCP ${formatMs(sample.fcp)}, LCP ${formatMs(sample.lcp)} (${sample.lcpSource})`,
            );
        }

        if (samples.some((sample) => sample.lcpSource !== 'lcp-entry')) {
            const note = 'LCP entries unavailable in this runtime; using FirstMeaningfulPaint fallback for budget checks.';
            summary.notes.push(note);
            console.warn(note);
        }

        const fcpValues = samples.map((sample) => sample.fcp);
        const lcpValues = samples.map((sample) => sample.lcp);
        const fcpMedian = median(fcpValues);
        const lcpMedian = median(lcpValues);
        summary.medians = { fcp: fcpMedian, lcp: lcpMedian };

        console.log(`Median FCP: ${formatMs(fcpMedian)}`);
        console.log(`Median LCP: ${formatMs(lcpMedian)}`);

        const failures = [];
        if (fcpMedian > fcpBudgetMs) {
            failures.push(`Median FCP ${formatMs(fcpMedian)} exceeds budget ${fcpBudgetMs}ms.`);
        }
        if (lcpMedian > lcpBudgetMs) {
            failures.push(`Median LCP ${formatMs(lcpMedian)} exceeds budget ${lcpBudgetMs}ms.`);
        }

        if (failures.length) {
            failures.forEach((message) => console.error(message));
            summary.failures = failures;
            summary.pass = false;
            process.exitCode = 1;
            return;
        }

        summary.pass = true;
        console.log('Performance budget audit passed.');
    } catch (error) {
        summary.failures = [error.message];
        summary.pass = false;
        throw error;
    } finally {
        summary.finishedAt = new Date().toISOString();
        writeSummary(summary);
        if (browser) {
            await browser.close();
        }
        await stopPreviewServer(preview.child);
    }
};

run().catch((error) => {
    console.error(`Performance budget audit failed: ${error.message}`);
    process.exit(1);
});
