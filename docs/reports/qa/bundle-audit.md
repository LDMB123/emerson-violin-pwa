# Bundle Audit (2026-02-04)

## Summary
- Initial JS (gzip): 8.7 KB (`emerson-violin-pwa.js`)
- Total JS (gzip): 8.8 KB
- Total CSS (gzip): 4.2 KB
- Total WASM (gzip): 104.9 KB
- Largest assets (gzip):
  - `emerson-violin-pwa_bg.wasm` 104.9 KB
  - `emerson-violin-pwa.js` 8.7 KB
  - `app.css` 2.5 KB

## Findings
- Loader JS remains minimal; Rust/WASM is the largest payload.
- CSS is compact after Trunk bundling.

## Recommendations
- Keep WASM exports focused; re-run `trunk build --release` for size checks.
- Track budget deltas in `scripts/build/budgets.json`.
