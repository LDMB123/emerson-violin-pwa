# Rebuild Roadmap (Rust/WASM First)

This roadmap freezes new JS features and prioritizes a Rust/WASM + modern CSS stack for Chromium 143 on Apple Silicon.

## Phase 0 — Feature Freeze + JS Reduction (Complete)
- Replace JS UI behaviors with native HTML/CSS (`:has`, scroll-driven animations).
- JS limited to Trunk loader + service worker.
- Lock down new JS additions unless required for platform glue.

## Phase 1 — Rust/WASM Core (Complete)
- Establish Rust crate (`Cargo.toml`, `rust/`) + Trunk pipeline.
- Move practice flow, tools, storage, and PWA UX into Rust modules.
- Keep interop surface minimal and stable.

## Phase 2 — State + Storage (In Progress)
- Rust-first data models (`sessions`, `recordings`, `syncQueue`, `shareInbox`).
- IndexedDB adapters in `rust/storage.rs`.
- Continue adding persistence only where it delivers user value.

## Phase 3 — ML Enhancements (Chromium 143)
- Add WebGPU inference path for on-device ML.
- Use quantized models (INT8/FP16) tuned for Apple Silicon.
- Ship ML only when it improves core user outcomes.

## Phase 4 — Feature Reintroduction (In Progress)
- Scaffold tuner/metronome/recorder in Rust.
- Expand DSP, calibration, and playback depth as needed.
- Reintroduce coaching/games in small, measurable slices.
