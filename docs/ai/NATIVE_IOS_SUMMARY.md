# Native iOS Summary (Token-Optimized)

- Source: `native/ios/README.md`
- Target: iPad mini 6 (A15), SwiftUI shell + `WKWebView`, Core ML bridge

## Setup
- Create `EmersonViolinShell` SwiftUI app, add `native/ios/EmersonViolinShell` contents
- Frameworks: WebKit, CoreML, GameController, CoreMotion, CoreHaptics, AVFoundation
- Add `.mlmodel` files to target
- Bundle PWA into `Resources/pwa` or set `AppConfig.defaultOrigin`
- ATS exception for dev server if needed
- `UseAppScheme` toggle for `file://` vs `app://`
- `PWAContentVersion` for bundle refresh; `PWAForceRefresh` for one-time copy
- `npm run ios:bundle` refreshes `Resources/pwa`; `dist/pwa-manifest.json` for integrity
- Integrity banner prompts refresh if `PWAIntegrityRequired`

## JS APIs
- Core ML: `window.NativeCoreML.infer`, `.listModels`, `.downloadModelPack`, `.runEval`, `.status`
- Gaming: `window.NativeGaming.controllers`, `.motion`, `.haptics`, `.audioSession`
- Shell: `window.NativeShell.status`, `.refresh`, `.verify`

## Notes
- Model pack location: `~/Library/Application Support/EmersonViolinShell/Models/`
- `PWAInstaller` compares `PWAContentVersion` vs installed version
- `PWAIntegrityVerifier` checks `pwa-manifest.json`
