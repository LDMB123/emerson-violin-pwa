# Architecture Options

## Option A - PWA-Only (Maximize Safari)

**System Diagram**
```text
Home Screen PWA
  -> App Shell (index.html, CSS)
  -> Navigation API / hash fallback
  -> View Modules (features/*)
  -> Core Services (platform, persistence, offline, ML)
  -> IndexedDB + Cache Storage
  -> Audio: Mic -> AudioContext -> AudioWorklet -> WASM -> UI
  -> Service Worker: precache, pack cache, self-test, auto-repair
```

**Module Boundaries**
- `src/app.js` boot, routing, lazy feature loading.
- `src/core/platform/*` install, offline, perf, capability gating.
- `src/core/persistence/*` IndexedDB KV + blobs + integrity checks.
- `src/core/audio/*` audio budget monitor + utilities.
- `src/core/worklets/*` DSP processing and scheduling.
- `src/core/wasm/*` generated bindings from `wasm-src`.
- `src/core/ml/*` recommendations + feature store.
- `src/features/*` view modules per screen.

**Data Storage**
- IndexedDB `panda-violin-db` with `kv` + `blobs` stores.
- Integrity keys prefixed `__integrity__:` for JSON values.
- Cache Storage for app shell and lesson pack assets.
- Lesson pack manifest cached in `__pack-manifests__`.
- Storage persistence request in Settings when offline packs are enabled.

**Caching Plan**
- Precache app shell and critical assets.
- Cache-first for static assets and fonts.
- Stale-while-revalidate for JSON and noncritical data.
- Range requests supported for audio.
- Pack auto-repair on activate and refresh.

**Audio Pipeline**
- User gesture -> AudioContext resume.
- Mic stream -> AudioWorkletNode.
- Worklet -> WASM pitch detection.
- UI updates on main thread with throttled events.
- JS fallback when Worklet/WASM unavailable.

**Build Pipeline**
- Vite 6 ESM build.
- wasm-pack build + copy via `npm run wasm:prepare`.
- SW asset manifest pre/post build.
- Perf budgets enforced in postbuild.
- Worker format set to ESM for Safari.

**JS Reduction Strategy**
- Navigation API for routing with hash fallback.
- `command/commandfor` for dialogs and popovers.
- CSS `field-sizing`, `content-visibility`, container queries.
- Lazy-load view modules and noncritical features.

**Risks + Mitigations**
- Risk: Safari storage eviction.
- Mitigation: request persistent storage, self-test, auto-repair.
- Risk: Audio policy restrictions.
- Mitigation: user gesture gating and resume on visibility.
- Risk: Boot-time JS creep.
- Mitigation: budget gates, lazy loading, view-level init.

## Option B - PWA + Wrapper Path (Escape Hatch)

**System Diagram**
```text
PWA Core (same as Option A)
  -> Shared JS/WASM engine
  -> Optional Native Wrapper (future)
  -> Native audio + storage bridges
```

**Module Boundaries**
- Same as Option A.
- Add `src/core/bridge/*` for optional native messaging.
- Keep core engine side-effect free for reuse.

**Data Storage**
- IndexedDB + Cache Storage initially.
- Optional native storage adapter later with sync bridge.

**Audio Pipeline**
- Same as Option A by default.
- Future: native capture feeding shared WASM DSP.

**Build Pipeline**
- Same as Option A.
- Wrapper build outside this repo with a strict bridge contract.

**JS Reduction Strategy**
- Same as Option A.
- Avoid heavy UI frameworks to keep WebView fast.

**Risks + Mitigations**
- Risk: wrapper adds complexity.
- Mitigation: keep PWA standalone and optional.
- Risk: API divergence.
- Mitigation: single bridge interface and feature flags.
