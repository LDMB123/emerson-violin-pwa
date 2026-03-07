# Audio, WASM, And Realtime

Audio and realtime features are layered so simple playback remains separate from heavier session analysis and coaching flows.

## Audio Layers

- general audio bootstrap and helpers live under `src/audio/`
- shared tone-player lifecycle and `AudioContext` recovery live under `src/audio/tone-player/`
- tuner and some gameplay flows depend on real-time audio processing and worklets
- optional WASM modules live under `src/wasm/` and `wasm/`

## Realtime Session Layer

- `src/realtime/session-controller.js` is the public session entry point
- runtime state, lifecycle, policy processing, metrics, and audio graph code are split across `src/realtime/`
- realtime UI hooks and overlays are activated through the app/module registry rather than as a separate app shell

## Source Of Truth

- tone-player context handling: `src/audio/tone-player/context-manager.js`
- realtime session entrypoint: `src/realtime/session-controller.js`
- worklets: `src/worklets/`
- wasm loaders/bindings: `src/wasm/`

## Maintainer Guidance

- If a change affects audio unlock, interruption handling, worklet/runtime startup, or realtime payload contracts, update this file and the relevant implementation note in `CLAUDE.md`
- Keep docs at the boundary/ownership level; do not try to mirror individual function docs from `src/realtime/`
