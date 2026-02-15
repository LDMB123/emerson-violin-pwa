# Build Budgets

Last updated: 2026-02-15

These budgets are enforced in `postbuild` via `scripts/build/check-budgets.js`.

## Gzip Budgets

- Initial JS: 15 KB
- Total JS: 30 KB
- Total CSS: 50 KB
- Total WASM: 110 KB

## Notes

- Budgets are set to keep iPad mini 6 load times and memory stable.
- If budgets fail, reduce bundle size or update `scripts/build/budgets.json` with a rationale in an ADR.
