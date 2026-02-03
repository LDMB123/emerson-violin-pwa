# WASM + Rust Modernization Pass

## Goals
- Use Rust/WASM for CPU-heavy, deterministic logic.
- Reduce JS hot paths during audio, games, and analytics.
- Keep graceful fallbacks for unsupported environments.

## Current WASM Coverage
- `panda-audio` — pitch detection + tone generation.
- `panda-core` — XP system, achievements, skill profile, streaks.

## Immediate Opportunities (High ROI)
1. **Game timing & tap scoring** (Completed)
   - Added `src/core/wasm/game-timer.js` wrapper.
   - Pilot wired into Rhythm Dash with JS fallback.

2. **Skill profile rules** (Completed)
   - Ported rule mapping into `SkillProfile.apply_practice_event`.
   - JS falls back if WASM build is unavailable.

3. **Practice streak + daily summaries**
   - Consolidate `calculate_streak` logic in Rust as a single API.

## Medium-Term Opportunities
- **Session analytics** aggregation in Rust for predictable CPU usage.
- **Feature extraction** for ML (simple transforms, windows).
- **Audio DSP** (envelope, smoothing) in `panda-audio`.

## Tooling
Scripts added:
- `npm run wasm:build` (requires `wasm-pack`)
- `npm run wasm:copy`
- `npm run wasm:prepare`

## Guardrails
- Always keep JS fallback paths for Safari edge cases.
- Prefer small, testable Rust exports over monolithic modules.
- Track regressions by comparing JS vs WASM outputs in unit tests.

## Proposed Next Steps
1. Expand `GameTimer` usage to other rhythm-based games.
2. Add parity tests for JS vs WASM scoring outputs.
3. Review remaining Rust warnings in `panda-audio`.

## Status Update (February 3, 2026)
- Rebuilt wasm via `npm run wasm:prepare` and refreshed `src/core/wasm` artifacts.
- Added unit smoke test to validate `SkillProfile.apply_practice_event` is exported.
