# Performance Audit (2026-02-03)

## Executive Summary
- Overall health: Good
- Top focus areas: Audio latency stability, offline cache integrity, and avoiding background compute while hidden.
- Recent improvements: audio budget monitor, storage integrity checks, lesson pack auto-repair, capability-tier gating.

## Key Observations
- Cold start JS footprint is small (Initial JS 4.9 KB gzip).
- Largest runtime cost is in WASM audio/core binaries and `game-metrics`.
- Perf telemetry already captures LCP, input latency, long tasks, frames, and audio budget.

## Recommendations
- Keep recommendations refresh gated by capability tier and defer while hidden (implemented).
- Maintain lazy loading for `game-metrics` and other non-home views.
- Continue to monitor audio budget percentage in tuner baseline snapshots.

## Metrics to Track
- TTI proxy, LCP, input max, long task max, frame max
- Audio budget avg/max, tuner start ms
- Memory usage after 5 minutes

## Next Checks
- Capture a new iPad mini 6 baseline bundle and compare against current budgets.
- Re-run after any UI changes or WASM updates.
