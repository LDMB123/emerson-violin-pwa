# Architecture Options

## Option A - PWA-Only (Maximize Safari)

- System diagram
- `UI (HTML/CSS) -> Navigation API/hash -> View modules`
- `View modules -> Core services (platform, persistence, offline, ML)`
- `Core services -> IndexedDB + Cache Storage`
- `Audio UI -> AudioWorklet -> WASM pitch engine`
- `Service Worker -> App shell + lesson packs + offline self-test`

- Module boundaries
- `src/app.js` boot + view routing + lazy module loading
- `src/core/platform/*` install, offline, perf, capabilities
- `src/core/persistence/*` IndexedDB KV + blobs
- `src/core/worklets/*` DSP scheduling
- `src/core/wasm/*` generated bindings
- `src/features/*` UI modules by view

- Data storage approach
- IndexedDB DB `panda-violin-db`
- Store `kv`: settings, progress, streaks, lesson state
- Store `blobs`: recordings, lesson pack bundles
- Cache Storage: app shell, fonts, icons, audio samples
- Storage protection: `navigator.storage.persist` gated to Home Screen or offline mode

- Caching plan
- Precache app shell + core assets
- Cache-first for static assets, stale-while-revalidate for non-critical JSON
- Range request support for audio blobs
- Lesson pack prefetch with explicit user action + progress UI
- Update strategy: SW notify, apply on next launch, avoid surprise UI changes

- Audio pipeline
- Mic -> AudioContext -> AudioWorkletNode
- AudioWorklet -> WASM pitch detection
- Worklet -> main thread UI updates
- JS fallback for no AudioWorklet/WASM
- Audio policy: user gesture + resume on visibility

- Build pipeline
- Vite 6 ESM build
- wasm-pack build via `npm run wasm:prepare`
- SW asset manifest generation pre/post build
- Perf budget checks in build (later phase)

- JS reduction strategy
- Navigation API + hash fallback
- Native popover/dialog with `command` + `commandfor`
- CSS `field-sizing`, `content-visibility`, `contain-intrinsic-size`
- `startViewTransition` only where safe
- Lazy-load view modules only on navigation

- Risks + mitigations
- Safari storage eviction
- Mitigation: storage persist request + offline self-test
- Audio policy restrictions
- Mitigation: user gesture gating + resume on visibility
- Large DOM at boot
- Mitigation: content-visibility + view-specific lazy init
- Service worker update drift
- Mitigation: prompt + apply on next launch

## Option B - PWA + Wrapper Path (Escape Hatch)

- System diagram
- `PWA core -> shared JS/WASM engine`
- `Wrapper (future) -> native shell -> WebView + native audio APIs`
- `Native shell -> offline storage bridge (later)`

- Module boundaries
- Same as Option A
- Add `src/core/bridge/*` for native messaging (future)
- Keep JS/WASM engine portable and side-effect free

- Data storage approach
- Same as Option A initially
- Future: optional native storage adapter with sync bridge

- Audio pipeline
- Same as Option A
- Future: native audio capture + shared WASM DSP

- Build pipeline
- Same as Option A
- Future: wrapper build (Capacitor/Tauri) outside core repo

- JS reduction strategy
- Same as Option A
- Keep UI frameworkless to ease WebView perf

- Risks + mitigations
- Wrapper adds complexity
- Mitigation: keep core PWA standalone, wrapper optional
- Native API divergence
- Mitigation: strict bridge interface + feature flags
- Store duplication
- Mitigation: single-source-of-truth adapter layer
