# Legacy Strategy Summary (Token-Optimized)

- Sources: `docs/_archived/legacy-docs/strategy/*.md`
- Scope: pre-rebuild planning for iPad mini 6 / Safari 26.2 era

## Modernization Audit (modernization-audit.md)
- Target: iPad mini 6 A15, Safari 26.2
- Goal: minimize JS, maximize native HTML/CSS + platform APIs, keep offline deterministic
- Focus areas: navigation, settings/diagnostics, offline core, persistence, audio/worklets, games, coach tools, ML, install/manifest, styling
- Top refactors: Navigation API, `command/commandfor`, CSS `field-sizing` + anchor positioning
- Status notes: added nav utility, WASM game timer, audio budget monitor, storage checksums, SW auto-repair

## Architecture Options (architecture-options.md)
- Option A: PWA-only, full web stack, IndexedDB + Cache Storage, AudioWorklet → WASM DSP, SW precache + auto-repair
- Option B: PWA core with optional native wrapper; keep bridge optional and stable
- Risks: Safari storage eviction, audio policy, JS boot creep; mitigations listed

## Modernization Plan (modernization-plan.md)
- Phase 0: baseline + observability
- Phase 1: audio/storage/offline stability
- Phase 2: device capability gating + storage persistence + mic flow
- Phase 3: architecture options + ADRs
- Phase 4: tooling + JS reduction
- Phase 5: WASM audio engine
- Phase 6: kid-first UX
- Phase 7: offline completion + QA

## Groundbreaking Foundation (groundbreaking-foundation.md)
- Pillars: low-latency UX, offline determinism, audio stability, edge ML, observability
- Immediate actions listed as implemented (prefetch, pack versioning, auto-repair, audio watchdogs, integrity checks)
- Horizon items: WASM feature extraction, background sync, automated baseline perf capture

## WASM + Rust Modernization (wasm-rust-modernization.md)
- Goal: move CPU-heavy logic to Rust/WASM with JS fallbacks
- Coverage: pitch + tone DSP, XP/achievements/skill profile
- Opportunities: game timing, skill profile rules, streak summaries, analytics aggregation
- Guardrails: keep JS fallback, small exports, JS vs WASM parity tests

## Device Capability Matrix (device-capability-matrix.md)
- Tier 3: A15 Home Screen, full WASM + prefetch
- Tier 2: balanced, WASM + constrained background compute
- Tier 1: low power, JS fallback + minimal prefetch
- Gating: WASM audio, ML compute, prefetch size, view transitions
