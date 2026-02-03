# Build Budgets

These budgets are enforced in `postbuild` via `scripts/build/check-budgets.js`.

## Gzip Budgets

- Initial JS: 220 KB
- Total JS: 380 KB
- Total CSS: 90 KB
- Total WASM: 320 KB

## Notes

- Budgets are set to keep iPad mini 6 load times and memory stable.
- If budgets fail, reduce bundle size or update `scripts/build/budgets.json` with a rationale in an ADR.
