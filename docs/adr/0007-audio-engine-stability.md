# ADR-0007: Pitch Stability + Fallback Tuner

- Status: accepted
- Date: 2026-02-03

## Context
- Need stable pitch display for children
- AudioWorklet + WASM is primary path
- Must still function if AudioWorklet or WASM is unavailable

## Decision
- Add note stability tracking in Rust `PitchDetector`
- Expose stable note/cents and stability ratio to JS
- Add fallback tuner path using main-thread WASM when AudioWorklet is missing
- Apply updates to tuner UI to prefer stable note display

## Consequences
- Cleaner pitch UI with fewer jitter spikes
- Fallback path is slower but keeps tuner usable
- Slightly larger WASM bindings and generated JS
