# ADR-0001: Vite + ESM Baseline

- Status: accepted
- Date: 2026-02-03

## Context
- Need fast dev/build cycle for iterative PWA tuning
- App already ESM-first and frameworkless
- Goal minimize runtime JS and keep tooling simple

## Decision
- Keep Vite 6 as bundler
- Keep native ESM and minimal build plugins
- Add perf budget reporting in build pipeline (later phase)

## Consequences
- Low tooling overhead, fast HMR
- Requires explicit performance budgets to avoid regressions
- No framework-level routing/state abstractions by default
