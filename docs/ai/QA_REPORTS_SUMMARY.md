# QA Reports Summary (Token-Optimized)

- Source: `docs/reports/qa/*.md`
- Legacy iPadOS QA logs archived in `docs/_archived/legacy-docs/reports/qa/`

## Build Budgets
- Enforced in `scripts/build/check-budgets.js`
- Gzip budgets: Initial JS 15 KB, Total JS 30 KB, Total CSS 50 KB, Total WASM 110 KB
- Update `scripts/build/budgets.json` with ADR if changed

## Bundle Audit (2026-02-04)
- Initial JS gzip 8.7 KB, Total JS 8.8 KB
- Total CSS gzip 4.2 KB, Total WASM gzip 104.9 KB
- Largest assets: `emerson-violin-pwa_bg.wasm`, `emerson-violin-pwa.js`, `app.css`

## Performance Audit (2026-02-03)
- Overall health good; focus on audio latency stability + background compute gating + game loop hygiene
- Notes: audio budget monitor, storage integrity checks, lesson pack auto-repair, capability gating, baseline snapshots, tuner sampling
- Track: TTI proxy, LCP, input max, long task max, frame max, audio budget avg/max, tuner start ms, memory after 5 min

## Accessibility Audit (2026-02-03)
- Manual pass only; skip link, aria labels, progress bars, polite live regions, dialog/popover semantics
- Follow-ups: automated audits (axe/Lighthouse), iPad focus order, alt text for decorative badges

## Memory Audit (2026-02-03)
- Manual review; no critical leak patterns
- Timers cleared on view change/visibility; telemetry sampling gated to visible diagnostics
- Follow-ups: heap snapshots after 5 min tuner + game use, watch retained media streams, consider AbortController for new listeners

## Other
- `docs/reports/qa/perf/` contains exported perf bundles (see `docs/reports/qa/perf/README.md`)
- `docs/reports/qa/screenshots/` contains dated QA screenshots
