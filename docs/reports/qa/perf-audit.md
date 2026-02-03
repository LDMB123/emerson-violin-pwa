# Performance Audit (2026-02-03)

## Executive Summary
- Overall health: Good
- Top focus areas: Audio latency stability, background compute suppression, and game loop hygiene.
- Recent improvements: audio budget monitor, storage integrity checks, lesson pack auto-repair, capability-tier gating, auto baseline snapshots, paused frame sampling when hidden, SW range streaming, and metronome scheduler stabilization.

## Key Observations
- Cold start JS footprint remains small (Initial JS 5.2 KB gzip, Total JS 114.2 KB, CSS 24.4 KB, WASM 67.4 KB).
- Largest runtime cost is still in WASM audio/core binaries and `game-metrics`.
- Perf telemetry captures LCP, input latency, long tasks, frames, audio budget, and tuner start time.
- Baseline snapshots auto-capture at 5 minutes and after 60 seconds of tuner use.

## Recommendations
- Keep recommendations refresh gated by capability tier and defer while hidden (implemented).
- Maintain lazy loading for `game-metrics` and other non-home views.
- Continue to monitor audio budget percentage in tuner baseline snapshots.
- Consider splitting `game-metrics` by game type if bundle size becomes a bottleneck on older iPads.

## Metrics to Track
- TTI proxy, LCP, input max, long task max, frame max
- Audio budget avg/max, tuner start ms
- Memory usage after 5 minutes

## Next Checks
- Capture a new iPad mini 6 baseline bundle and compare against current budgets.
- Re-run after any UI changes or WASM updates.
