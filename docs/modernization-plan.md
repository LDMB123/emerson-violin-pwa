# Modernization Plan

## Phase 0 - Baseline + Instrumentation
- Inventory stack and dependencies
- Baseline metrics capture plan for iPad mini 6
- Instrument TTI proxy, audio worklet budget, offline readiness self-test
- Persist metrics in IndexedDB
- Add baseline report template in `docs/reports/qa/`

Acceptance criteria
- Metrics stored locally and viewable in settings
- Baseline checklist runnable on iPad mini 6
- No runtime network calls added

## Phase 1 - Architecture Options + ADRs
- Define Option A (PWA-only) architecture diagram and module boundaries
- Define Option B (PWA + wrapper path) architecture diagram and module boundaries
- Add ADRs for core decisions (tooling, storage, audio engine boundary)

Acceptance criteria
- Two options documented with risks + mitigations
- ADRs in `docs/adr/`

## Phase 2 - Tooling + JS Reduction
- ESM-first build remains Vite unless alternative wins on perf and simplicity
- Enforce perf budget in build output (bundle size + critical path)
- Reduce eager module loading in `src/app.js`
- Replace JS UI toggles with `command` + `commandfor` where safe

Acceptance criteria
- Cold-start JS eval reduced vs baseline
- No regression in installability or offline

## Phase 3 - Offline First Hardening
- Lesson pack prefetch with progress UI
- Update strategy: prompt + apply on next launch
- Storage persistence prompts for offline packs

Acceptance criteria
- Airplane mode usable after first load
- Offline self-test passes for app shell and lesson pack

## Phase 4 - WASM Audio Engine
- Rust pitch detection API boundary
- AudioWorklet + Worker split to prevent main-thread stalls
- JS fallback path gated by feature detection
- Rust unit tests with known frequency vectors

Acceptance criteria
- Stable tuner at 60fps UI
- No UI freeze on start/stop
- Audio pipeline works in Home Screen mode

## Phase 5 - Kid-First UX
- Home, Daily Path, Tuner, Metronome, Rewards screens refined
- Large touch targets, minimal text, strong contrast
- Parent gate (long press or simple math)

Acceptance criteria
- Tap targets >= 48px
- Parent gate prevents accidental entry

## Phase 6 - QA + Perf
- iPad mini 6 checklist runs
- Regression tests in Playwright + Vitest
- Manual audio latency checks

Acceptance criteria
- Checklist complete with recorded metrics
- No critical regressions vs baseline
