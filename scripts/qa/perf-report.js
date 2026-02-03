import fs from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
};

const inputPath = getArg('--input');
if (!inputPath) {
    console.error('Usage: node scripts/qa/perf-report.js --input <perf-json> [--output <md>]);');
    process.exit(1);
}

const outputPath = getArg('--output');

const formatMs = (value) => (Number.isFinite(value) ? `${Math.round(value)} ms` : '—');
const formatPct = (value) => (Number.isFinite(value) ? `${Math.round(value)}%` : '—');
const formatBytes = (value) => {
    if (!Number.isFinite(value)) return '—';
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const formatNumber = (value) => (Number.isFinite(value) ? `${value}` : '—');

const formatConnection = (connection) => {
    if (!connection) return '—';
    const parts = [];
    if (connection.effectiveType) parts.push(connection.effectiveType);
    if (Number.isFinite(connection.downlink)) parts.push(`${connection.downlink} Mbps`);
    if (Number.isFinite(connection.rtt)) parts.push(`${connection.rtt} ms RTT`);
    if (connection.saveData) parts.push('save-data');
    return parts.length ? parts.join(' · ') : '—';
};

const formatStorage = (storage) => {
    if (!storage) return '—';
    const usage = Number.isFinite(storage.usage) ? formatBytes(storage.usage) : '—';
    const quota = Number.isFinite(storage.quota) ? formatBytes(storage.quota) : '—';
    return `${usage} used / ${quota} quota`;
};

const buildReport = (payload) => {
    const samples = Array.isArray(payload.samples) ? payload.samples : [];
    const latest = samples[0] || {};
    const env = payload.env || {};

    const lines = [];
    lines.push(`# Perf Report (${new Date(payload.exportedAt || Date.now()).toLocaleString()})`);
    lines.push('');
    lines.push('## Environment');
    lines.push(`- User agent: ${env.userAgent || '—'}`);
    lines.push(`- Platform: ${env.platform || '—'}`);
    lines.push(`- Screen: ${env.screen?.width || '—'}x${env.screen?.height || '—'} (avail ${env.screen?.availWidth || '—'}x${env.screen?.availHeight || '—'})`);
    lines.push(`- Device pixel ratio: ${formatNumber(env.devicePixelRatio)}`);
    lines.push(`- Device memory: ${formatNumber(env.deviceMemory)} GB`);
    lines.push(`- Hardware concurrency: ${formatNumber(env.hardwareConcurrency)}`);
    lines.push(`- Connection: ${formatConnection(env.connection)}`);
    lines.push(`- Storage: ${formatStorage(env.storage)}`);
    lines.push('');

    lines.push('## Latest Sample');
    lines.push(`- TTI proxy: ${formatMs(latest.ttiProxyMs)}`);
    lines.push(`- LCP: ${formatMs(latest.lcpMs)}`);
    lines.push(`- Input max: ${formatMs(latest.eventMaxMs)}`);
    lines.push(`- Long task max: ${formatMs(latest.longTaskMaxMs)}`);
    lines.push(`- Frame max: ${formatMs(latest.frameMaxMs)}`);
    lines.push(`- Audio avg/max: ${formatMs(latest.audioAvgMs)} / ${formatMs(latest.audioMaxMs)} (${formatPct(latest.audioBudgetPct)})`);
    lines.push(`- Tuner start: ${formatMs(latest.tunerStartMs)}`);
    lines.push(`- Memory: ${formatBytes(latest.memoryBytes)}`);
    lines.push('');

    lines.push('## Targets (iPad mini 6)');
    lines.push('- TTI proxy: <= 1200 ms');
    lines.push('- LCP: <= 2500 ms');
    lines.push('- Frame max: <= 32 ms');
    lines.push('- Audio budget pct: <= 70%');
    lines.push('- Tuner start: <= 500 ms');
    lines.push('- Memory: stable (no runaway growth)');
    lines.push('');

    lines.push('## Notes');
    lines.push('- Attach this report to `docs/reports/qa/ipados-26_2-issue-log.md` if issues are found.');

    return lines.join('\n');
};

const main = async () => {
    const input = path.resolve(inputPath);
    const raw = await fs.readFile(input, 'utf8');
    const payload = JSON.parse(raw);
    const report = buildReport(payload);

    if (outputPath) {
        const out = path.resolve(outputPath);
        await fs.writeFile(out, report, 'utf8');
        console.log(`[perf-report] Wrote ${out}`);
        return;
    }

    console.log(report);
};

main().catch((error) => {
    console.error('[perf-report] Failed', error);
    process.exit(1);
});
