# Audio, WASM, And Realtime

Audio and realtime features are layered so simple playback remains separate from heavier session analysis and coaching flows.

## Audio Layers

- general audio bootstrap and helpers live under `src/audio/`
- shared tone-player lifecycle and `AudioContext` recovery live under `src/audio/tone-player/`
- standalone Web Audio tool views (`metronome`, `drone`) should use `src/audio/audio-context.js` rather than constructing raw `window.AudioContext` instances directly
- song playback and song recording are intentionally separate flows: `/songs/:id/play` must work without microphone access, while `/songs/:id/play?record=1` is the microphone-gated recording path
- recording persistence is blob-first via `src/recordings/recordings-storage.js`; playback should resolve through `resolveRecordingSource()` / `playRecordingWithSoundCheck()` rather than assuming inline data URLs
- tuner and some gameplay flows depend on real-time audio processing and worklets
- optional WASM modules live under `src/wasm/` and `wasm/`

## Realtime Session Layer

- `src/realtime/session-controller.js` is the public session entry point
- runtime state, lifecycle, policy processing, metrics, and audio graph code are split across `src/realtime/`
- realtime UI hooks and overlays are activated through the app/module registry rather than as a separate app shell

## Source Of Truth

- tone-player context handling: `src/audio/tone-player/context-manager.js`
- standalone audio context bootstrap: `src/audio/audio-context.js`
- song recorder hook: `src/hooks/useMediaRecorder.js`
- persisted recording playback resolution: `src/persistence/loaders.js` and `src/utils/recording-playback-utils.js`
- realtime session entrypoint: `src/realtime/session-controller.js`
- worklets: `src/worklets/`
- wasm loaders/bindings: `src/wasm/`

## Maintainer Guidance

- If a change affects audio unlock, interruption handling, worklet/runtime startup, or realtime payload contracts, update this file and the relevant implementation note in `CLAUDE.md`
- Hidden/background lifecycle is part of audio correctness: metronome, drone, song recording, and realtime mic flows must release or pause cleanly on `visibilitychange` / `pagehide`
- Keep docs at the boundary/ownership level; do not try to mirror individual function docs from `src/realtime/`
