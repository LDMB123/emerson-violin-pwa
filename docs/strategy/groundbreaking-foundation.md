# Groundbreaking Foundation Plan

This is a technical north star for a next-gen, offline-first, kid-friendly music PWA on iPadOS.
Focus: deterministic offline behavior, low-latency audio, and a modular architecture that scales.

## Pillars

1. **Predictive, low-latency UX**
   - Data-driven view registry with prefetch and idle loading.
   - Intent-based prefetch (hover/focus) on nav to reduce cold starts.
   - View Transition API sparingly where it’s safe.

2. **Offline determinism**
   - Runtime integrity checks + self-heal for cache drift.
   - Lesson packs versioned with explicit compatibility gates.
   - Storage persistence prompts tied to offline workflows.

3. **Audio pipeline stability**
   - AudioWorklet-only hot path; JS fallback gated.
   - WASM DSP for pitch + tempo with perf telemetry.
   - Audio budget tracking in perf diagnostics UI.

4. **Adaptive learning at the edge**
   - Local-first inference with deterministic inputs.
   - Scheduled background compute (idle + low-power awareness).
   - Clear fallbacks when WASM/WebGPU unavailable.

5. **Operational observability**
   - Performance + audio metrics stored in IndexedDB.
   - QA export flows for baseline comparisons.
   - Build budgets enforced in CI and local builds.

## Immediate Technical Actions (Now)
- Convert boot to a feature registry (data-driven loading + prefetch). (Implemented)
- Version lesson packs with a cached manifest + stale detection. (Implemented)
- Auto-verify cached lesson packs during refresh/activate. (Implemented)
- Add audio worklet health watchdogs with fallback gating. (Implemented)
- Add audio budget breach detection + automatic fallback. (Implemented)
- Add storage integrity checksums for IndexedDB values. (Implemented)
- Add a 60-second AI fast path doc for onboarding. (Implemented)
- Add planning index in `docs/strategy/`. (Implemented)

## Next Wave (Short-Term)
- Add prefetch policies per view and device capability tier.
- Add offline mutation queue + retry backoff for storage writes. (Implemented)
- Add perf snapshot export to QA report bundle.
- Move ML recommendations compute to a worker for main-thread relief.

## Horizon (Medium-Term)
- Consolidate ML feature extraction into WASM.
- Add background sync for lesson pack updates.
- Automate iPad mini 6 baseline perf capture.
