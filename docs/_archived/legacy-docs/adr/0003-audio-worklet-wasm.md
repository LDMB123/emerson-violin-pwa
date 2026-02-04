# ADR-0003: AudioWorklet + WASM Pitch Engine

- Status: accepted
- Date: 2026-02-03

## Context
- Need low-latency pitch detection for violin
- Main thread must stay responsive for kid-first UI
- iPadOS Safari has strict audio policies

## Decision
- Use AudioWorklet for DSP scheduling
- Run pitch detection in WASM (Rust)
- No wasm threads by default; gate behind runtime checks
- Provide JS fallback for unsupported worklet/WASM

## Consequences
- Improved latency and stability on iPad mini 6
- Extra build step for wasm-pack
- Requires clear API boundary between JS and WASM
