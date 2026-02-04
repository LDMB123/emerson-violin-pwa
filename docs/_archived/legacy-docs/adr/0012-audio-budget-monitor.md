# ADR-0012: Audio Budget Monitor for Worklet Overload

- Status: accepted
- Date: 2026-02-03

## Context
- AudioWorklet processing can exceed buffer budget under heavy load.
- Sustained overruns cause audio glitches and UI instability on iPad hardware.

## Decision
- Track processing time vs buffer budget using a small budget monitor.
- Trip into a fallback path after a configurable number of breaches.
- Reset counters on stable frames to avoid noisy toggling.

## Consequences
- Adds minimal per-frame computation in the tuner loop.
- Provides deterministic fallback behavior under overload.
- Requires tuning thresholds per device tier if needed.
