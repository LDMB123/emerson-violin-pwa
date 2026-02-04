# ADR-0009: Enforce Build Budgets

- Status: accepted
- Date: 2026-02-03

## Context
- Need repeatable performance guardrails for iPad mini 6
- Bundle growth directly affects TTI, memory, and battery use
- Build step already generates SW assets; best place to enforce budgets

## Decision
- Add `scripts/build/check-budgets.js` and enforce gzip budgets in `postbuild`
- Store thresholds in `scripts/build/budgets.json`

## Consequences
- Builds fail fast when bundles exceed limits
- Budget adjustments must be documented and justified
