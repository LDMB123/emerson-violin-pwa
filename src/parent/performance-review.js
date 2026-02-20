import { getLatestWebVitalsSession, getWebVitalsHistory } from '../platform/web-vitals.js';

let statusEl = null;
let detailEl = null;
let globalsBound = false;

const resolveElements = () => {
    statusEl = document.querySelector('[data-web-vitals-status]');
    detailEl = document.querySelector('[data-web-vitals-detail]');
};

const scoreLabel = (value, { good, needsWork, formatter = (v) => String(v) } = {}) => {
    if (!Number.isFinite(value)) return `${formatter('n/a')} (no data)`;
    if (value <= good) return `${formatter(value)} (good)`;
    if (value <= needsWork) return `${formatter(value)} (needs work)`;
    return `${formatter(value)} (poor)`;
};

const formatMs = (value) => `${Math.round(value)} ms`;
const formatCls = (value) => Number(value).toFixed(3);

const percentile75 = (values) => {
    const finite = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
    if (!finite.length) return null;
    const index = Math.max(0, Math.ceil(0.75 * finite.length) - 1);
    return finite[index];
};

const summarizeP75 = (sessions) => {
    const metricsList = sessions
        .map((session) => session?.metrics || null)
        .filter(Boolean);

    return {
        count: metricsList.length,
        lcp: percentile75(metricsList.map((metrics) => metrics.lcp)),
        inp: percentile75(metricsList.map((metrics) => metrics.inp)),
        cls: percentile75(metricsList.map((metrics) => metrics.cls)),
    };
};

const renderSession = ({ latest, history }) => {
    if (!statusEl || !detailEl) return;
    if (!latest) {
        statusEl.textContent = 'Performance snapshots are empty. Use the app to collect local metrics.';
        detailEl.textContent = 'Latest LCP/INP/CLS summary appears here once a session ends.';
        return;
    }

    const latestMetrics = latest.metrics || {};
    const latestLcp = scoreLabel(latestMetrics.lcp, {
        good: 2500,
        needsWork: 4000,
        formatter: formatMs,
    });
    const latestInp = scoreLabel(latestMetrics.inp, {
        good: 200,
        needsWork: 500,
        formatter: formatMs,
    });
    const latestCls = scoreLabel(latestMetrics.cls, {
        good: 0.1,
        needsWork: 0.25,
        formatter: formatCls,
    });

    const p75 = summarizeP75(history.sessions || []);
    const p75Lcp = scoreLabel(p75.lcp, {
        good: 2500,
        needsWork: 4000,
        formatter: formatMs,
    });
    const p75Inp = scoreLabel(p75.inp, {
        good: 200,
        needsWork: 500,
        formatter: formatMs,
    });
    const p75Cls = scoreLabel(p75.cls, {
        good: 0.1,
        needsWork: 0.25,
        formatter: formatCls,
    });

    statusEl.textContent = `p75 (${p75.count} sessions): LCP ${p75Lcp}, INP ${p75Inp}, CLS ${p75Cls}.`;
    detailEl.textContent = `Latest: LCP ${latestLcp}, INP ${latestInp}, CLS ${latestCls}. Captured ${new Date(latest.timestamp).toLocaleString()} on ${latest.route || '#view-home'} after ${Math.round((latest.sessionMs || 0) / 1000)}s.`;
};

const refresh = async () => {
    const [latest, history] = await Promise.all([
        getLatestWebVitalsSession().catch(() => null),
        getWebVitalsHistory().catch(() => ({ sessions: [] })),
    ]);
    renderSession({ latest, history });
};

const bindGlobals = () => {
    if (globalsBound) return;
    globalsBound = true;
    document.addEventListener('panda:web-vitals-updated', refresh);
};

const initPerformanceReview = () => {
    resolveElements();
    if (!statusEl || !detailEl) return;
    bindGlobals();
    refresh();
};

export const init = initPerformanceReview;
