# Bundle Audit (2026-02-03)

## Summary
- Initial JS (gzip): 4.9 KB
- Total JS (gzip): 111.4 KB
- Total CSS (gzip): 24.2 KB
- Total WASM (gzip): 67.4 KB
- Largest assets (gzip):
  - `panda_core_bg.wasm` 45.0 KB
  - `panda_audio_bg.wasm` 22.4 KB
  - `game-metrics` 15.1 KB
  - `main.css` 24.2 KB

## Findings
- No heavy third-party dependencies detected in `package.json`.
- Largest payloads are WASM binaries and core CSS, which are expected.
- `game-metrics` remains the largest JS chunk; watch for growth.

## Recommendations
- Keep WASM exports focused and avoid bundling unused Rust code.
- Maintain `game-metrics` as a lazy-loaded feature to protect boot time.
- Continue to enforce `scripts/build/budgets.json` with ADRs for any increases.
