# iOS Shell + Core ML Bridge

This folder provides a minimal SwiftUI shell with a `WKWebView` and a Core ML bridge for the PWA. It is designed for iPad mini 6 (A15) with compute units set to `.all` (ANE/GPU/CPU).

**Setup**
1. Create a new iOS App in Xcode (SwiftUI, Swift) and name it `EmersonViolinShell`.
2. Drag the contents of `native/ios/EmersonViolinShell` into the Xcode target.
3. Add `WebKit`, `CoreML`, `GameController`, `CoreMotion`, `CoreHaptics`, and `AVFoundation` frameworks to the target.
4. Add your `.mlmodel` files to the target (Xcode will compile them into `.mlmodelc`).
5. Bundle your built PWA into `Resources/pwa` (include `index.html` + assets) or set `AppConfig.defaultOrigin` to your hosted URL.
6. If loading a dev server, add an ATS exception in `Info.plist` for that domain.
7. Optional: set `UseAppScheme = NO` (force `file://`) or `UseAppScheme = YES` (force `app://`) in `UserDefaults` to control how offline assets are served.
8. Optional: add `PWAContentVersion` to `Info.plist` to refresh the local PWA cache when you ship a new bundle.
9. Optional: add `native/ios/Settings.bundle` and `Info.plist.sample` to the target for runtime toggles + app-bound domains.
10. Run `npm run ios:bundle` after each build (or rely on `postbuild`) to refresh `Resources/pwa`.
11. `postbuild` now generates `dist/pwa-manifest.json` to enable integrity verification on device.
12. The shell now shows a native integrity banner with a one-tap refresh if integrity fails.

**JS API**
```js
// Native Core ML inference from the PWA
const output = await window.NativeCoreML.infer(
  'YourModelName',
  inputArray,
  { inputKey: 'input', outputKey: 'output' }
);

// List bundled Core ML models (compiled .mlmodelc)
const models = await window.NativeCoreML.listModels();

// Download a model pack manifest (optional, for offline upgrades)
await window.NativeCoreML.downloadModelPack('https://your-domain/model-pack.json');

// Run on-device evaluation (uses model-eval.json)
const evalReport = await window.NativeCoreML.runEval('PitchQuality');

// Check bridge status + telemetry snapshot
const status = await window.NativeCoreML.status();
```

**Native Gaming API**
```js
// Controller support (GCController)
const controllers = await window.NativeGaming.controllers.list();
const unsubscribe = window.NativeGaming.controllers.onEvent((event) => {
  console.log('controller event', event);
});

// Motion data (CoreMotion)
await window.NativeGaming.motion.start({ frequency: 60 });
window.NativeGaming.motion.onEvent((motion) => {
  console.log('motion', motion);
});

// Haptics (Core Haptics / UIFeedback)
await window.NativeGaming.haptics.impact('light');
await window.NativeGaming.haptics.notification('success');

// Audio session tuning
await window.NativeGaming.audioSession.configure({
  category: 'playAndRecord',
  mode: 'measurement',
  preferredSampleRate: 48000,
  preferredIOBufferDuration: 0.005
});
```

**Native Shell API**
```js
// Query native shell status (PWA scheme + integrity)
const result = await window.NativeShell.status();
const status = result.status;

// Force refresh (copy bundled PWA to app support)
await window.NativeShell.refresh(); // triggers a reload in the native shell

// Force integrity check now
await window.NativeShell.verify();
```

**Notes**
1. `inputKey` and `outputKey` are optional; defaults assume `input` and the first multi-array output.
2. Results are returned as a flat array; use `shape` if you need to rehydrate tensor dimensions.
3. Model packs are stored in `~/Library/Application Support/EmersonViolinShell/Models/`.
4. When `UseAppScheme` is enabled (or unset and a local PWA folder exists), assets load from `app://pwa/...` via `OfflineSchemeHandler` and the local `Application Support/EmersonViolinShell/pwa` directory (fallback to bundled `Resources/pwa`).
5. Set `PWAForceRefresh = YES` in `UserDefaults` to force a one-time copy of bundled PWA assets into `Application Support`.
6. `PWAInstaller` compares `PWAContentVersion` to `PWAContentVersionInstalled` and refreshes when the version changes.
7. `PWAIntegrityVerifier` checks `pwa-manifest.json` and will request a refresh if integrity fails (when `PWAIntegrityRequired` is enabled).
