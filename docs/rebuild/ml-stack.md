# Emerson Violin Studio ML Stack (2026)

## Goals
- On-device inference for pitch, rhythm, and focus coaching
- Privacy-first: no cloud dependency by default
- Multi-backend execution: Core ML → WebGPU → WASM → Rust heuristics

## Runtime Layers
1. Signal ingest
   - Pitch samples from `rust/tuner.rs`
   - Tempo samples from `rust/metronome.rs`
   - Session events from `rust/session.rs`

2. Feature store
   - Rolling buffers: pitch samples, tempo samples
   - Feature frames (focus score, stability, accuracy)
   - Persistent IndexedDB/localStorage

3. Adaptive engine
   - EMA updates per session
   - Profile: intonation, rhythm, focus

4. Model registry (future)
   - `public/models/manifest.json` for planned model targets
   - Registry surfaces availability and Core ML readiness

5. Inference manager (future)
   - Choose backend based on registry + availability
   - Log telemetry (p50/p95 latency)

## Backends
- Rust heuristics: current baseline (`rust/ml.rs`)
- Core ML: native iOS bridge via `window.NativeCoreML` (future)
- WebGPU: GPU acceleration in Chromium (future)
- WASM: embedded model fallback (future)

## Next Steps
- Replace Rust heuristics with real model inference where it improves outcomes.
- Attach Core ML model pack download to the registry.
- Add offline evaluation metrics.
