# Modernization Plan

## Phase 0 - Baseline + Observability
- Confirm stack inventory and baseline capture workflow.
- Capture iPad mini 6 perf bundle using `scripts/qa/perf-bundle.js`.
- Persist metrics and expose last snapshot in Settings.
- Lock build budgets and perf bundle checklist.

Acceptance criteria
- Baseline perf bundle checked into `docs/reports/qa/perf/`.
- Settings show last snapshot values for TTI proxy, LCP, input latency, memory, and audio budget.
- Build budgets pass locally and in CI.

## Phase 1 - Core Stability (Audio + Storage + Offline)
- Audio budget monitor with fallback under sustained overload.
- Storage integrity checksums with repair signals.
- Lesson pack auto-repair in the service worker with UI status updates.
- Offline self-test and refresh wiring remains stable.

Acceptance criteria
- Tuner fallback triggers under sustained worklet overruns without UI freeze.
- Corrupt storage entries are quarantined and rehydrated.
- Lesson packs self-heal missing files when online.

## Phase 2 - Target Platform Reality (iPad mini 6 / Safari 26.2)
- Device capability matrix and gating for heavy features.
- Storage persistence request strategy and eviction handling.
- Microphone permission flow tuned for Home Screen install.

Acceptance criteria
- Capability matrix documented and applied in runtime gating.
- Storage persistence status surfaced in Settings.
- Mic permission flow works in Safari and Home Screen modes.

## Phase 3 - Architecture Options + ADRs
- Option A PWA-only and Option B wrapper path documented.
- Module boundaries, data flows, and tradeoffs clarified.
- ADRs added for new core decisions.

Acceptance criteria
- `docs/strategy/architecture-options.md` updated with diagrams and risks.
- ADRs added for each major decision in this phase.

## Phase 4 - Tooling + JS Reduction
- Enforce perf budget CI step and report deltas.
- Reduce eager JS modules in app boot.
- Adopt Navigation API and `command/commandfor` where safe.
- CSS-first replacements for layout and UI controls.

Acceptance criteria
- Cold-start JS eval reduced vs baseline.
- No installability or offline regressions.

## Phase 5 - WASM Audio Engine
- Rust pitch detection boundary and test vectors.
- Worker/Worklet split with JS fallback.
- Tuner demo screen validates end-to-end audio pipeline.

Acceptance criteria
- Stable tuner at 60fps UI on iPad mini 6.
- Clean fallback when WASM is unavailable.
- Rust unit tests cover known frequency vectors.

## Phase 6 - Kid-First UX
- Home, Daily Path, Tuner, Metronome, Rewards screens.
- Large touch targets, minimal text, strong contrast.
- Parent gate via long-press or simple math.

Acceptance criteria
- Tap targets >= 48px and readable.
- Parent gate prevents accidental access.

## Phase 7 - Offline Completion + QA
- Lesson pack prefetch with progress UI.
- Update strategy prompt + apply on next launch.
- iPad mini 6 QA checklist and perf regression checks.

Acceptance criteria
- Airplane mode works after first load.
- QA checklist complete with recorded metrics.
